import { describe, expect, it } from 'vitest';
import {
  normalizeRoundtableSessionDate,
  validateRoundtableQuestionInput,
} from './roundtableQuestions';

describe('normalizeRoundtableSessionDate', () => {
  it('keeps a valid activity date', () => {
    expect(normalizeRoundtableSessionDate(' 2026-08-29 ')).toBe('2026-08-29');
  });

  it('rejects values that cannot be used to filter a session', () => {
    expect(normalizeRoundtableSessionDate('2026/08/29')).toBeNull();
    expect(normalizeRoundtableSessionDate(undefined)).toBeNull();
  });
});

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

  it('accepts a one-line anonymous question without contact details', () => {
    const result = validateRoundtableQuestionInput({
      question: '我为什么总是在真正开始之前停下来？',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('匿名星友');
      expect(result.value.email).toBeNull();
      expect(result.value.context).toBe('');
      expect(result.value.availableDates).toEqual([]);
    }
  });

  it('requires a real question', () => {
    expect(
      validateRoundtableQuestionInput({
        ...validInput,
        question: '卡住',
      })
    ).toEqual({ ok: false, error: '问题需为 5–500 个字。' });
  });

  it('does not accept an untouched starter as a question', () => {
    expect(
      validateRoundtableQuestionInput({
        question: '我没想明白的是……',
      })
    ).toEqual({
      ok: false,
      error: '把省略号换成你真正想问的那一点。',
    });
  });

  it('drops invalid date values', () => {
    const result = validateRoundtableQuestionInput({
      ...validInput,
      availableDates: ['next week'],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.availableDates).toEqual([]);
  });
});
