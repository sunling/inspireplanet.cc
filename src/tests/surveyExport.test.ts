import { describe, expect, it } from 'vitest';
import { buildSurveyText } from '../utils/surveyExport';
import { Survey, SurveySubmission } from '../netlify/types/survey';

describe('buildSurveyText', () => {
  it('exports choice labels, multiline text and unanswered questions', () => {
    const survey = {
      title: '反馈',
      questions: [
        {
          id: 'choice',
          type: 'multiple',
          title: '喜欢什么',
          options: [
            { id: 'one', value: '1', label: '书写', text: '选项1' },
            { id: 'two', value: '2', label: '回顾', text: '选项2' },
          ],
        },
        { id: 'text', type: 'text', title: '建议' },
        { id: 'missing', type: 'rating', title: '评分' },
      ],
    } as Survey;
    const submissions = [
      {
        answers: [
          { questionId: 'choice', value: '["1","2"]' },
          { questionId: 'text', value: '第一行\n第二行' },
        ],
      },
    ] as SurveySubmission[];
    const text = buildSurveyText(survey, submissions);
    expect(text).toContain('书写、回顾');
    expect(text).toContain('第一行\n第二行');
    expect(text).toContain('（未作答）');
    expect(text).not.toContain('选项1');
  });
});
