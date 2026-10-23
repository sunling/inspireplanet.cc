import { Survey, SurveySubmission } from '../netlify/types/survey';
import { convertValueForRenderer } from './questionType';

export const buildSurveyText = (
  survey: Survey,
  submissions: SurveySubmission[]
): string => {
  const lines = [
    survey.title,
    survey.description || '',
    `问题数：${survey.questions.length}　作答份数：${submissions.length}`,
    '',
    '按问题整理，答卷编号在各题中保持一致。',
    '',
  ];
  survey.questions.forEach((question, index) => {
    lines.push(`问题 ${index + 1}：${question.title}`);
    if (question.description) lines.push(question.description);
    const isChoice = question.type === 'single' || question.type === 'multiple';
    if (isChoice)
      lines.push(
        '选项：' +
          (question.options || [])
            .map((option) => option.label || option.text)
            .join('；')
      );
    submissions.forEach((submission, submissionIndex) => {
      let value = convertValueForRenderer(
        submission.answers.find((answer) => answer.questionId === question.id)
          ?.value,
        question.type
      );
      if (isChoice) {
        value = (Array.isArray(value) ? value : [value])
          .filter((item) => item !== undefined && item !== null && item !== '')
          .map((item) => {
            const option = question.options?.find(
              (option) =>
                String(option.value) === String(item) ||
                String(option.id) === String(item)
            );
            return option ? option.label || option.text : String(item);
          })
          .join('、');
      }
      lines.push(
        `答卷 ${submissionIndex + 1}：`,
        value === undefined || value === null || value === ''
          ? '（未作答）'
          : String(value),
        ''
      );
    });
    lines.push('────────────────────────', '');
  });
  return lines.join('\n');
};
