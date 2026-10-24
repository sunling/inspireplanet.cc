import { QuestionAnswer } from '../types/survey';

export interface StoredQuestion {
  id: string;
  type: string;
  required?: boolean;
  options?: Array<{ value: string }>;
  max_rating?: number;
}

export function normalizeAnswers(input: unknown): QuestionAnswer[] | null {
  if (Array.isArray(input)) return input;
  if (input && typeof input === 'object')
    return Object.entries(input).map(([questionId, value]) => ({
      questionId,
      value,
    }));
  return null;
}

const empty = (value: unknown) =>
  value == null ||
  value === '' ||
  (typeof value === 'string' && !value.trim()) ||
  (Array.isArray(value) && value.length === 0);

// Validate the entire submitted questionnaire before any database mutation.
export function validateSurveyAnswers(
  questions: StoredQuestion[],
  answers: QuestionAnswer[]
): string | null {
  if (answers.length > questions.length) return '答案包含重复或无效的问题';
  const byId = new Map(questions.map((q) => [q.id, q]));
  const seen = new Set<string>();
  for (const answer of answers) {
    if (
      !answer ||
      typeof answer.questionId !== 'string' ||
      seen.has(answer.questionId) ||
      !byId.has(answer.questionId)
    )
      return '答案包含重复或不属于此问卷的问题';
    seen.add(answer.questionId);
    const q = byId.get(answer.questionId)!;
    const value = answer.value;
    if (empty(value)) {
      if (q.required) return '请回答所有必填问题';
      continue;
    }
    const allowed = new Set((q.options || []).map((o) => o.value));
    switch (q.type) {
      case 'text':
        if (typeof value !== 'string' || value.length > 10000)
          return '文本答案无效或过长';
        break;
      case 'single':
      case 'select':
        if (typeof value !== 'string' || !allowed.has(value))
          return '单选答案不在选项中';
        break;
      case 'multiple':
      case 'checkbox':
        if (
          !Array.isArray(value) ||
          value.some((v) => typeof v !== 'string' || !allowed.has(v)) ||
          new Set(value).size !== value.length
        )
          return '多选答案无效';
        break;
      case 'rating':
        if (
          typeof value !== 'number' ||
          !Number.isInteger(value) ||
          value < 1 ||
          value > (q.max_rating || 5)
        )
          return '评分超出范围';
        break;
      case 'date':
        if (
          typeof value !== 'string' ||
          !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          !Number.isFinite(Date.parse(value)) ||
          new Date(value).toISOString().slice(0, 10) !== value
        )
          return '日期答案无效';
        break;
      default:
        return '不支持的问题类型';
    }
  }
  if (questions.some((q) => q.required && !seen.has(q.id)))
    return '请回答所有必填问题';
  return null;
}

export const storedAnswerValue = (value: unknown): string =>
  Array.isArray(value)
    ? JSON.stringify(value)
    : value == null
      ? ''
      : String(value);
