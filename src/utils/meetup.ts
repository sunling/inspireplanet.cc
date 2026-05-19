/**
 * 活动相关的公共工具函数
 */
import { RSVP, RSVPStatus, ApprovalStatus } from '../netlify/types/rsvp';
import {
  Survey,
  SurveyQuestion,
  QuestionOption,
} from '../netlify/types/survey';

/**
 * 解析问卷答案为可显示的格式
 */
export interface ParsedAnswer {
  title: string;
  answer: string;
}

export const parseSurveyAnswers = (
  surveyAnswers: string | null | undefined,
  survey: Survey
): ParsedAnswer[] => {
  if (!surveyAnswers) return [];

  try {
    const answers = JSON.parse(surveyAnswers);
    return survey.questions
      .map((question: SurveyQuestion) => {
        const answerValue = answers[question.id];
        if (answerValue === undefined || answerValue === null) {
          return null;
        }

        let displayValue = String(answerValue);

        // 如果是选择题且有 options，尝试找到对应选项的文本
        if (question.options && Array.isArray(question.options)) {
          // 辅助函数：检查值是否匹配（支持类型转换比较）
          const matchesValue = (optVal: string | number, ansVal: unknown) => {
            if (optVal == ansVal) return true;
            if (String(optVal) === String(ansVal)) return true;
            if (Number(optVal) === Number(ansVal)) return true;
            return false;
          };

          // 处理 answerValue 可能是 JSON 字符串的情况
          let parsedAnswerValue = answerValue;
          if (typeof answerValue === 'string') {
            try {
              const parsed = JSON.parse(answerValue);
              if (Array.isArray(parsed)) {
                parsedAnswerValue = parsed;
              }
            } catch {
              // 不是 JSON 字符串，保持原值
            }
          }

          const matchedOption = question.options.find(
            (opt: QuestionOption) =>
              matchesValue(opt.value, parsedAnswerValue) ||
              matchesValue(opt.id as string | number, parsedAnswerValue)
          );
          if (matchedOption) {
            displayValue = matchedOption.text;
          } else if (Array.isArray(parsedAnswerValue)) {
            // 多选情况
            const selectedTexts = question.options
              .filter((opt: QuestionOption) =>
                parsedAnswerValue.some(
                  (av: unknown) =>
                    matchesValue(opt.value, av) ||
                    matchesValue(opt.id as string | number, av)
                )
              )
              .map((opt: QuestionOption) => opt.text);
            if (selectedTexts.length > 0) {
              displayValue = selectedTexts.join(', ');
            }
          }
        }

        return {
          title: question.title,
          answer: displayValue,
        };
      })
      .filter(
        (item: ParsedAnswer | null): item is ParsedAnswer => item !== null
      );
  } catch (error) {
    console.error('解析问卷答案失败:', error);
    return [];
  }
};

/**
 * 统计参与者数据
 */
export interface ParticipantStats {
  total: number;
  confirmed: number;
  cancelled: number;
  pending: number;
  approved: number;
  rejected: number;
}

export const calculateParticipantStats = (
  participants: RSVP[],
  confirmedCount = 0,
  cancelledCount = 0
): ParticipantStats => {
  return {
    total: participants.length,
    confirmed:
      confirmedCount ||
      participants.filter((p) => p.status === RSVPStatus.CONFIRMED).length,
    cancelled:
      cancelledCount ||
      participants.filter((p) => p.status === RSVPStatus.CANCELLED).length,
    pending: participants.filter(
      (p) => p.application_status === ApprovalStatus.PENDING
    ).length,
    approved: participants.filter(
      (p) => p.application_status === ApprovalStatus.APPROVED
    ).length,
    rejected: participants.filter(
      (p) => p.application_status === ApprovalStatus.REJECTED
    ).length,
  };
};

/**
 * 判断问题是否有值
 */
export const hasQuestionValue = (
  questionType: string,
  answer: unknown
): boolean => {
  switch (questionType) {
    case 'rating':
      return answer !== undefined && answer !== null && Number(answer) > 0;
    case 'multiple':
      return Array.isArray(answer) && answer.length > 0;
    default:
      return typeof answer === 'string' && answer.trim().length > 0;
  }
};

/**
 * 转换表单答案为问卷提交格式
 */
export const convertAnswersForSubmission = (
  answers: Record<string, unknown>
): Array<{ questionId: string; value: unknown }> => {
  return Object.entries(answers).map(([questionId, value]) => ({
    questionId,
    value,
  }));
};
