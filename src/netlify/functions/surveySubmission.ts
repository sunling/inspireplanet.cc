import { NetlifyEvent, NetlifyResponse } from '../types/http';
import { supabase } from '../../database/supabase';
import {
  createErrorResponse,
  createSuccessResponse,
  getDataFromEvent,
  getFuntionNameFromEvent,
} from '../utils/server';
import {
  SubmitSurveyRequest,
  SurveySubmission,
  QuestionAnswer,
} from '../types/survey';

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const action = getFuntionNameFromEvent(event) as
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

async function handleSubmit(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const requestData = getDataFromEvent(event);
    const { surveyId, answers, email, respondentId } =
      requestData as SubmitSurveyRequest & { respondentId: string };

    if (
      !surveyId ||
      !answers ||
      !Array.isArray(answers) ||
      answers.length === 0
    ) {
      return createErrorResponse('缺少必要参数', 400);
    }

    if (!respondentId) {
      return createErrorResponse('缺少提交者信息', 400);
    }

    // 检查问卷是否存在且激活
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('id, is_active, allow_multiple_submissions')
      .eq('id', surveyId)
      .single();

    if (surveyError) {
      console.error('Error finding survey:', surveyError);
      return createErrorResponse('问卷不存在', 404);
    }

    if (!survey.is_active) {
      return createErrorResponse('问卷已关闭', 400);
    }

    // 检查是否允许重复提交
    if (!survey.allow_multiple_submissions) {
      const { data: existingSubmission, error: submissionError } =
        await supabase
          .from('survey_submissions')
          .select('id')
          .eq('survey_id', surveyId)
          .eq('respondent_id', respondentId)
          .single();

      if (!submissionError && existingSubmission) {
        return createErrorResponse('您已经提交过此问卷', 400);
      }
    }

    // 开始事务：创建提交记录
    const { data: submission, error: submissionError } = await supabase
      .from('survey_submissions')
      .insert({
        survey_id: surveyId,
        respondent_id: respondentId,
        respondent_email: email,
        ip_address:
          event.headers['x-forwarded-for'] ||
          event.headers['client-ip'] ||
          'unknown',
        user_agent: event.headers['user-agent'],
      })
      .select('id')
      .single();

    if (submissionError) {
      console.error('Error creating submission:', submissionError);
      return createErrorResponse(submissionError.message, 500);
    }

    // 创建答案记录
    const answerPromises = answers.map((answer: QuestionAnswer) => {
      return supabase
        .from('survey_answers')
        .insert({
          submission_id: submission.id,
          question_id: answer.questionId,
          value: answer.value,
        })
        .select();
    });

    const answerResults = await Promise.all(answerPromises);
    const answerErrors = answerResults.filter((r) => r.error);

    if (answerErrors.length > 0) {
      console.error('Error creating answers:', answerErrors);
      // 回滚：删除已创建的提交记录
      await supabase
        .from('survey_submissions')
        .delete()
        .eq('id', submission.id);
      return createErrorResponse('提交答案失败', 500);
    }

    return createSuccessResponse({
      id: submission.id,
      message: '问卷提交成功',
    });
  } catch (error) {
    console.error('Error in handleSubmit:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

async function handleGetBySurveyId(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  try {
    const requestData = getDataFromEvent(event);
    const { surveyId, page = 1, pageSize = 10 } = requestData;

    if (!surveyId) {
      return createErrorResponse('缺少问卷 ID', 400);
    }

    // 获取提交记录
    const {
      data: submissions,
      error: submissionError,
      count,
    } = await supabase
      .from('survey_submissions')
      .select('*', { count: 'exact' })
      .eq('survey_id', surveyId)
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
          .select('question_id, value')
          .eq('submission_id', submission.id);

        if (answersError) {
          console.error('Error getting answers:', answersError);
          return submission;
        }

        return {
          id: submission.id,
          surveyId: submission.survey_id,
          respondentId: submission.respondent_id,
          respondentEmail: submission.respondent_email,
          submittedAt: submission.submitted_at,
          answers: (answers || []).map((a) => ({
            questionId: a.question_id,
            value: a.value,
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
    const requestData = getDataFromEvent(event);
    const { respondentId, page = 1, pageSize = 10 } = requestData;

    if (!respondentId) {
      return createErrorResponse('缺少提交者 ID', 400);
    }

    // 获取用户的提交记录
    const {
      data: submissions,
      error: submissionError,
      count,
    } = await supabase
      .from('survey_submissions')
      .select('*, surveys(title)', { count: 'exact' })
      .eq('respondent_id', respondentId)
      .order('submitted_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (submissionError) {
      console.error('Error getting my submissions:', submissionError);
      return createErrorResponse(submissionError.message, 500);
    }

    // 格式化响应
    const formattedSubmissions = (submissions || []).map((submission) => ({
      id: submission.id,
      surveyId: submission.survey_id,
      surveyTitle: submission.surveys?.title,
      submittedAt: submission.submitted_at,
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
    const requestData = getDataFromEvent(event);
    const { surveyId, respondentId } = requestData;

    if (!surveyId || !respondentId) {
      return createErrorResponse('缺少必要参数', 400);
    }

    // 获取用户的提交记录
    const { data: submission, error: submissionError } = await supabase
      .from('survey_submissions')
      .select('*')
      .eq('survey_id', surveyId)
      .eq('respondent_id', respondentId)
      .single();

    if (submissionError) {
      console.error('Error checking submission:', submissionError);
      return createErrorResponse('检查提交记录失败', 500);
    }

    const { data: answers, error: answersError } = await supabase
      .from('survey_answers')
      .select('question_id, value')
      .eq('submission_id', submission.id);

    if (answersError) {
      console.error('Error getting answers:', answersError);
      return createErrorResponse('获取答案失败', 500);
    }

    const submissionWithAnswers = {
      id: submission.id,
      surveyId: submission.survey_id,
      respondentId: submission.respondent_id,
      respondentEmail: submission.respondent_email,
      submittedAt: submission.submitted_at,
      answers: (answers || []).map((a) => ({
        questionId: a.question_id,
        value: a.value,
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
    const requestData = getDataFromEvent(event);
    const { id, answers } = requestData;

    if (!id || !answers || !Array.isArray(answers)) {
      return createErrorResponse('缺少必要参数', 400);
    }

    // 检查提交记录是否存在
    const { data: submission, error: submissionError } = await supabase
      .from('survey_submissions')
      .select('id')
      .eq('id', id)
      .single();

    if (submissionError || !submission) {
      return createErrorResponse('提交记录不存在', 404);
    }

    // 删除旧答案
    await supabase.from('survey_answers').delete().eq('submission_id', id);

    // 创建新答案
    const answerPromises = answers.map((answer: QuestionAnswer) => {
      return supabase.from('survey_answers').insert({
        submission_id: id,
        question_id: answer.questionId,
        value: answer.value,
      });
    });

    const answerResults = await Promise.all(answerPromises);
    const answerErrors = answerResults.filter((r) => r.error);

    if (answerErrors.length > 0) {
      console.error('Error updating answers:', answerErrors);
      return createErrorResponse('更新答案失败', 500);
    }

    return createSuccessResponse({
      id: submission.id,
      message: '答案更新成功',
    });
  } catch (error) {
    console.error('Error in handleUpdate:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}
