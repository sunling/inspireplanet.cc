import { describe, expect, it } from 'vitest';
import { validateRoundtableQuestionInput } from './roundtableQuestions';

const validInput = {
  name: '小星',
  email: 'STAR@example.com',
  question: '我为什么一直无法开始创作？',
  context:
    '这件事已经持续了半年。我收集了很多资料，但每次准备开始就会转去学习新的东西。',
  boundaries: '',
  availableDates: ['2026-09-05'],
  otherAvailability: '',
};

describe('validateRoundtableQuestionInput', () => {
  it('normalizes a valid submission', () => {
    const result = validateRoundtableQuestionInput(validInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe('star@example.com');
      expect(result.value.boundaries).toBeNull();
    }
  });

  it('requires a real question and enough context', () => {
    expect(
      validateRoundtableQuestionInput({
        ...validInput,
        question: '卡住',
      })
    ).toEqual({ ok: false, error: '问题需为 5–500 个字。' });
  });

  it('requires at least one available time', () => {
    expect(
      validateRoundtableQuestionInput({
        ...validInput,
        availableDates: [],
      })
    ).toEqual({
      ok: false,
      error: '请选择可参加的场次，或填写其他方便时间。',
    });
  });

  it('drops invalid date values', () => {
    const result = validateRoundtableQuestionInput({
      ...validInput,
      availableDates: ['next week'],
    });
    expect(result.ok).toBe(false);
  });
});
