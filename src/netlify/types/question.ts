export type QuestionType = 'single' | 'multiple' | 'text' | 'rating' | 'date';

export interface QuestionOption {
  id: string;
  text: string;
  label: string;
  value: string;
}

export interface QuestionConfig {
  id?: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  options?: QuestionOption[];
  maxRating?: number;
  placeholder?: string;
  sortOrder?: number;
}

export const createDefaultOption = (index: number): QuestionOption => ({
  id: `option_${Date.now()}_${index}`,
  text: `选项 ${String.fromCharCode(65 + index)}`,
  label: `选项 ${String.fromCharCode(65 + index)}`,
  value: `option_${index + 1}`,
});

export const createDefaultQuestion = (
  type: QuestionType = 'text'
): QuestionConfig => ({
  id: `q_${Date.now()}`,
  type,
  title: '',
  required: false,
  options:
    type === 'text'
      ? undefined
      : [createDefaultOption(0), createDefaultOption(1)],
  placeholder: type === 'text' ? '请输入...' : undefined,
  sortOrder: 0,
});

export const questionTypeLabels: Record<QuestionType, string> = {
  single: '单选题',
  multiple: '多选题',
  text: '文本题',
  rating: '评分题',
  date: '日期题',
};

export const questionTypeIcons: Record<QuestionType, string> = {
  single: '○',
  multiple: '☐',
  text: '📝',
  rating: '⭐',
  date: '📅',
};
