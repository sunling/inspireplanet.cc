import { randomUUID } from 'node:crypto';
import { supabase } from '../../database/supabase';
import { NetlifyEvent } from '../types/http';
import { AuthenticatedUser } from './server';
import {
  normalizeAnswers,
  validateSurveyAnswers,
  storedAnswerValue,
} from '../validation/surveyAnswers';

export class SubmissionError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export async function loadOpenSurvey(id: string) {
  const { data: survey, error } = await supabase
    .from('surveys')
    .select(
      'id, is_active, allow_multiple_submissions, start_date, end_date, meetup_id, is_for_meetup'
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new SubmissionError('读取问卷失败', 500);
  if (!survey) throw new SubmissionError('问卷不存在', 404);
  const now = Date.now();
  if (
    !survey.is_active ||
    (survey.start_date && !(Date.parse(survey.start_date) <= now)) ||
    (survey.end_date && !(Date.parse(survey.end_date) >= now))
  )
    throw new SubmissionError('问卷未开放或已关闭');
  return survey;
}

export async function checkedAnswers(surveyId: string, input: unknown) {
  const answers = normalizeAnswers(input);
  if (!answers) throw new SubmissionError('答案格式无效');
  const { data: questions, error } = await supabase
    .from('survey_questions')
    .select('id, type, required, options, max_rating')
    .eq('survey_id', surveyId);
  if (error || !questions) throw new SubmissionError('读取问卷问题失败', 500);
  const invalid = validateSurveyAnswers(questions, answers);
  if (invalid) throw new SubmissionError(invalid);
  return answers;
}

// This is an internal server context, never copied from request JSON.
export interface RegistrationContext {
  id: number;
  survey_id: string;
  skip_login: boolean;
}

export async function createSurveySubmission(
  event: NetlifyEvent,
  surveyId: string,
  input: unknown,
  user: AuthenticatedUser | null,
  registration?: RegistrationContext
) {
  if (!user && !registration?.skip_login)
    throw new SubmissionError('请先登录后提交问卷', 401);
  const survey = await loadOpenSurvey(surveyId);
  if (
    registration &&
    (String(registration.survey_id) !== String(survey.id) ||
      (survey.meetup_id != null &&
        String(survey.meetup_id) !== String(registration.id)))
  )
    throw new SubmissionError('活动与问卷关联不匹配');
  if (!registration && survey.is_for_meetup)
    throw new SubmissionError('请通过活动报名页面提交此问卷');
  const answers = await checkedAnswers(surveyId, input);
  const respondentId = user ? String(user.id) : `guest_${randomUUID()}`;
  let existingId: string | null = null;
  if (!survey.allow_multiple_submissions) {
    const { data: existing, error } = await supabase
      .from('survey_submissions')
      .select('id')
      .eq('survey_id', surveyId)
      .eq('respondent_id', respondentId)
      .limit(1)
      .maybeSingle();
    if (error) throw new SubmissionError('检查提交记录失败', 500);
    if (existing && !registration)
      throw new SubmissionError('您已经提交过此问卷，请修改原答卷');
    existingId = existing?.id || null;
  }
  if (existingId) {
    if (answers.length) {
      const { error } = await supabase.from('survey_answers').upsert(
        answers.map((answer) => ({
          submission_id: existingId,
          question_id: answer.questionId,
          value: storedAnswerValue(answer.value),
        })),
        { onConflict: 'submission_id,question_id' }
      );
      if (error) throw new SubmissionError('更新报名答案失败', 500);
    }
    return { id: existingId, respondentId, created: false };
  }
  let email: string | null = null;
  if (user) {
    const { data: profile, error } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw new SubmissionError('读取提交者信息失败', 500);
    email = profile?.email || null;
  }
  const { data: submission, error } = await supabase
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
  if (error || !submission) throw new SubmissionError('创建答卷失败', 500);
  try {
    if (answers.length) {
      const { error: answerError } = await supabase
        .from('survey_answers')
        .insert(
          answers.map((answer) => ({
            submission_id: submission.id,
            question_id: answer.questionId,
            value: storedAnswerValue(answer.value),
          }))
        );
      if (answerError) throw new Error('answer insert failed');
    }
  } catch {
    // This ID was created here, not supplied by the caller.
    await discardNewSubmission(submission.id, respondentId);
    throw new SubmissionError('保存答案失败', 500);
  }
  return { id: String(submission.id), respondentId, created: true };
}

export async function discardNewSubmission(id: string, respondentId: string) {
  const { error } = await supabase
    .from('survey_submissions')
    .delete()
    .eq('id', id)
    .eq('respondent_id', respondentId);
  if (error)
    console.error('Unable to clean up a newly created survey submission');
}
