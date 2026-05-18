import {
  QuestionType,
  SurveyQuestion,
  QuestionOption,
} from '../netlify/types/survey';

/**
 * 将meetup的question_type转换为QuestionType
 * @param type meetup中的question_type值 ('text', 'select', 'checkbox')
 * @returns QuestionType类型 ('text', 'single', 'multiple', 'rating', 'date')
 */
export const convertFromMeetupType = (type: string): QuestionType => {
  switch (type) {
    case 'select':
      return 'single';
    case 'checkbox':
      return 'multiple';
    case 'single':
    case 'multiple':
    case 'text':
    case 'rating':
    case 'date':
      return type as QuestionType;
    default:
      return 'text';
  }
};

/**
 * 将QuestionType转换为meetup的question_type
 * @param type QuestionType类型
 * @returns meetup中的question_type值 ('text', 'select', 'checkbox')
 */
export const convertToMeetupType = (type: QuestionType): string => {
  switch (type) {
    case 'single':
      return 'select';
    case 'multiple':
      return 'checkbox';
    default:
      return type;
  }
};

/**
 * 将值转换为适合QuestionRenderer使用的格式
 * @param value 存储的问题答案值
 * @param type 问题类型
 * @returns 转换后的值
 */
export const convertValueForRenderer = (
  value: any,
  type: QuestionType
): any => {
  if (type === 'multiple' && typeof value === 'string' && value) {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return value;
};

/**
 * 将QuestionRenderer返回的值转换为适合存储的格式
 * @param value 问题答案值
 * @param type 问题类型
 * @returns 转换后的值
 */
export const convertValueForStorage = (value: any, type: QuestionType): any => {
  if (type === 'multiple' && Array.isArray(value)) {
    return value.join(',');
  }
  return value;
};

/**
 * 创建默认的问题选项
 * @param index 选项索引
 * @returns QuestionOption
 */
export const createDefaultOption = (index: number): QuestionOption => ({
  id: `option_${Date.now()}_${index}`,
  text: `选项 ${String.fromCharCode(65 + index)}`,
  label: `选项 ${String.fromCharCode(65 + index)}`,
  value: `option_${index + 1}`,
});

/**
 * 创建默认的问题配置
 * @param type 问题类型
 * @returns SurveyQuestion
 */
export const createDefaultQuestion = (
  type: QuestionType = 'text'
): SurveyQuestion => ({
  id: `q_${Date.now()}`,
  type,
  title: '',
  description: '',
  required: false,
  options:
    type === 'text'
      ? undefined
      : [createDefaultOption(0), createDefaultOption(1)],
  placeholder: type === 'text' ? '请输入...' : undefined,
  sortOrder: 0,
});

/**
 * 从Meetup字段创建SurveyQuestion
 * @param questionText 问题文本
 * @param questionType 问题类型（meetup格式）
 * @param questionOptions 选项字符串（逗号分隔）
 * @param questionRequired 是否必填
 * @returns SurveyQuestion
 */
export const createQuestionFromMeetup = (
  questionText: string,
  questionType: string,
  questionOptions: string,
  questionRequired: boolean
): SurveyQuestion => {
  const type = convertFromMeetupType(questionType);
  const question = createDefaultQuestion(type);

  question.title = questionText || '';
  question.required = questionRequired;

  if (type === 'text') {
    question.placeholder = '请输入...';
  } else if (questionOptions) {
    question.options = questionOptions.split(',').map((opt, idx) => {
      const optTrim = opt.trim();
      return {
        id: `opt_${idx}`,
        text: optTrim,
        label: optTrim,
        value: optTrim,
      };
    });
  }

  return question;
};

/**
 * 将SurveyQuestion转换为Meetup字段
 * @param question SurveyQuestion对象
 * @returns meetup问题字段对象
 */
export const convertQuestionToMeetup = (question: SurveyQuestion) => ({
  question_text: question.title,
  question_type: convertToMeetupType(question.type),
  question_options: question.options?.map((o) => o.value).join(',') || '',
  question_required: question.required,
});

/**
 * 问题类型标签映射
 */
export const questionTypeLabels: Record<QuestionType, string> = {
  single: '单选题',
  multiple: '多选题',
  text: '文本题',
  rating: '评分题',
  date: '日期题',
};

/**
 * 问题类型图标映射
 */
export const questionTypeIcons: Record<QuestionType, string> = {
  single: '○',
  multiple: '☐',
  text: '📝',
  rating: '⭐',
  date: '📅',
};
