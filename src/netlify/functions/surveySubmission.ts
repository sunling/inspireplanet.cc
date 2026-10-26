import {
  createSurveySubmission,
  loadOpenSurvey,
  checkedAnswers,
  SubmissionError,
} from '../utils/surveySubmission';
import { storedAnswerValue } from '../validation/surveyAnswers';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import { supabase } from '../../database/supabase';
import {
  createErrorResponse,
  createSuccessResponse,
  getDataFromEvent,
  getFunctionNameFromEvent,
  getAuthenticatedUser,
  handleOptionsRequest,
} from '../utils/server';
import { QuestionAnswer } from '../types/survey';

function answerValue(value: unknown, type?: string) {
  if (typeof value !== 'string') return value;
  if (type === 'rating' && value.trim() && Number.isFinite(Number(value)))
    return Number(value);
  if (type === 'multiple' || type === 'checkbox') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* Older choice answers were comma-separated. */
    }
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value;
}

function pagination(input: Record<string, unknown>) {
  const positive = (value: unknown, fallback: number, max: number) => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0
      ? Math.min(parsed, max)
      : fallback;
  };
  return {
    page: positive(input.page, 1, 100000),
    pageSize: positive(input.pageSize, 10, 100),
  };
}

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') return handleOptionsRequest();
  try {
    const action = getFunctionNameFromEvent(event) as
      | 'submit'
      | 'getBySurveyId'
      | 'getMySubmissions'
      | 'checkSubmission'
      | 'update';

    switch (action) {
      case 'submit':
        return await handleSubmit(event);
      case 'getBySurveyId':
        return await handleGetBySurveyId(event);
      case 'getMySubmissions':
        return await handleGetMySubmissions(event);
      case 'checkSubmission':
        return await handleCheckSubmission(event);
      case 'update':
        return await handleUpdate(event);
      default:
        return createErrorResponse('无效的动作', 400);
    }
  } catch (error) {
    console.error('SurveySubmission function error:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

export async function handleSubmit(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  if (event.httpMethod !== 'POST')
    return createErrorResponse('请求方式不支持', 405);
  try {
    const user = await getAuthenticatedUser(event);
    if (!user) return createErrorResponse('请先登录后提交问卷', 401);
    const input = getDataFromEvent(event);
    if (typeof input.survey_id !== 'string' || !input.survey_id)
      return createErrorResponse('缺少问卷 ID');
    const result = await createSurveySubmission(
      event,
      input.survey_id,
      input.answers,
      user
    );
    return createSuccessResponse({ id: result.id, message: '问卷提交成功' });
  } catch (error) {
    if (error instanceof SubmissionError)
      return createErrorResponse(error.message, error.status);
    console.error('Submit survey failed');
    return createErrorResponse('提交问卷失败', 500);
  }
}

async function handleGetBySurveyId(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  try {
    const user = await getAuthenticatedUser(event);
    if (!user) return createErrorResponse('未授权', 401);
    const requestData = getDataFromEvent(event);
    const { survey_id } = requestData;
    const { page, pageSize } = pagination(requestData);

    if (!survey_id) {
      return createErrorResponse('缺少问卷 ID', 400);
    }

    // Survey creators can still view their own results; other members cannot.
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('id, created_by')
      .eq('id', survey_id)
      .maybeSingle();
    if (surveyError) return createErrorResponse('读取问卷失败', 500);
    if (!survey) return createErrorResponse('问卷不存在', 404);
    if (user.role !== 'organizer' && String(survey.created_by) !== user.id)
      return createErrorResponse('没有权限查看问卷结果', 403);

    // 获取提交记录
    const {
      data: submissions,
      error: submissionError,
      count,
    } = await supabase
      .from('survey_submissions')
      .select('id, survey_id, respondent_id, respondent_email, submitted_at', {
        count: 'exact',
      })
      .eq('survey_id', survey_id)
      .order('submitted_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (submissionError) {
      console.error('Error getting submissions:', submissionError);
      return createErrorResponse(submissionError.message, 500);
    }

    // 获取每个提交的答案
    const submissionsWithAnswers = await Promise.all(
      (submissions || []).map(async (submission) => {
        const { data: answers, error: answersError } = await supabase
          .from('survey_answers')
          .select('question_id, value, survey_questions(type)')
          .eq('submission_id', submission.id);

        if (answersError) {
          console.error('Error getting answers:', answersError);
          throw new Error('读取答案失败');
        }

        return {
          id: submission.id,
          survey_id: submission.survey_id,
          respondent_id: submission.respondent_id,
          respondent_email: submission.respondent_email,
          submitted_at: submission.submitted_at,
          answers: (answers || []).map((a) => ({
            questionId: a.question_id,
            value: answerValue(a.value, a.survey_questions?.type),
          })),
        };
      })
    );

    return createSuccessResponse({
      records: submissionsWithAnswers,
      total: count || 0,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    console.error('Error in handleGetBySurveyId:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

async function handleGetMySubmissions(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  try {
    const user = await getAuthenticatedUser(event);
    if (!user) return createErrorResponse('未授权', 401);
    const requestData = getDataFromEvent(event);
    const { page, pageSize } = pagination(requestData);

    // 获取用户的提交记录
    const {
      data: submissions,
      error: submissionError,
      count,
    } = await supabase
      .from('survey_submissions')
      .select('id, survey_id, submitted_at, surveys(title)', { count: 'exact' })
      .eq('respondent_id', user.id)
      .order('submitted_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (submissionError) {
      console.error('Error getting my submissions:', submissionError);
      return createErrorResponse(submissionError.message, 500);
    }

    // 格式化响应
    const formattedSubmissions = (submissions || []).map((submission) => ({
      id: submission.id,
      survey_id: submission.survey_id,
      survey_title: submission.surveys?.title,
      submitted_at: submission.submitted_at,
    }));

    return createSuccessResponse({
      records: formattedSubmissions,
      total: count || 0,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error) {
    console.error('Error in handleGetMySubmissions:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

async function handleCheckSubmission(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  try {
    const user = await getAuthenticatedUser(event);
    if (!user) return createErrorResponse('未授权', 401);
    const requestData = getDataFromEvent(event);
    const { survey_id } = requestData;

    if (!survey_id) {
      return createErrorResponse('缺少必要参数', 400);
    }

    // 获取用户的提交记录
    const { data: submission, error: submissionError } = await supabase
      .from('survey_submissions')
      .select('id, survey_id, respondent_id, respondent_email, submitted_at')
      .eq('survey_id', survey_id)
      .eq('respondent_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (submissionError) {
      console.error('Error checking submission:', submissionError);
      return createErrorResponse('检查提交记录失败', 500);
    }
    if (!submission) return createSuccessResponse(null);

    const { data: answers, error: answersError } = await supabase
      .from('survey_answers')
      .select('question_id, value, survey_questions(type)')
      .eq('submission_id', submission.id);

    if (answersError) {
      console.error('Error getting answers:', answersError);
      return createErrorResponse('获取答案失败', 500);
    }

    const submissionWithAnswers = {
      id: submission.id,
      survey_id: submission.survey_id,
      respondent_id: submission.respondent_id,
      respondent_email: submission.respondent_email,
      submitted_at: submission.submitted_at,
      answers: (answers || []).map((a) => ({
        questionId: a.question_id,
        value: answerValue(a.value, a.survey_questions?.type),
      })),
    };

    return createSuccessResponse(submissionWithAnswers);
  } catch (error) {
    console.error('Error in handleCheckSubmission:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

async function handleUpdate(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const user = await getAuthenticatedUser(event);
    if (!user) return createErrorResponse('未授权', 401);
    if (event.httpMethod !== 'PUT' && event.httpMethod !== 'POST')
      return createErrorResponse('请求方式不支持', 405);
    const requestData = getDataFromEvent(event);
    const { id, answers } = requestData;

    if (!id || !Array.isArray(answers) || answers.length === 0) {
      return createErrorResponse('缺少必要参数', 400);
    }

    // 检查提交记录是否存在
    const { data: submission, error: submissionError } = await supabase
      .from('survey_submissions')
      .select('id, survey_id')
      .eq('id', id)
      .eq('respondent_id', user.id)
      .maybeSingle();

    if (submissionError || !submission) {
      return createErrorResponse('提交记录不存在', 404);
    }

    await loadOpenSurvey(submission.survey_id);
    const validatedAnswers = await checkedAnswers(
      submission.survey_id,
      answers
    );

    // One bulk statement prevents partial answer updates on a database error.
    const { error: updateError } = await supabase.from('survey_answers').upsert(
      validatedAnswers.map((answer: QuestionAnswer) => ({
        submission_id: id,
        question_id: answer.questionId,
        value: storedAnswerValue(answer.value),
      })),
      { onConflict: 'submission_id,question_id' }
    );
    if (updateError) return createErrorResponse('更新答案失败', 500);

    return createSuccessResponse({
      id: submission.id,
      message: '答案更新成功',
    });
  } catch (error) {
    if (error instanceof SubmissionError)
      return createErrorResponse(error.message, error.status);
    console.error('Error in handleUpdate:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}
