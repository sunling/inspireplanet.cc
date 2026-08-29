export interface RoundtableQuestionInput {
  name: string;
  email: string | null;
  question: string;
  context: string;
  boundaries: string | null;
  availableDates: string[];
  otherAvailability: string | null;
}

type ValidationResult =
  | { ok: true; value: RoundtableQuestionInput }
  | { ok: false; error: string };

const normalizeText = (value: unknown) => String(value || '').trim();

export const normalizeRoundtableSessionDate = (value: unknown) => {
  const date = normalizeText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
};

export const validateRoundtableQuestionInput = (
  input: Record<string, unknown>
): ValidationResult => {
  const name = normalizeText(input.name);
  const email = normalizeText(input.email).toLowerCase();
  const question = normalizeText(input.question);
  const context = normalizeText(input.context);
  const boundaries = normalizeText(input.boundaries) || null;
  const otherAvailability = normalizeText(input.otherAvailability) || null;
  const availableDates = Array.isArray(input.availableDates)
    ? input.availableDates
        .map(normalizeText)
        .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
        .slice(0, 8)
    : [];

  if (name.length > 80) {
    return { ok: false, error: '称呼请控制在 80 个字以内。' };
  }
  if (
    email &&
    (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    return { ok: false, error: '请填写有效的联系邮箱。' };
  }
  if (question.length < 5 || question.length > 500) {
    return { ok: false, error: '问题需为 5–500 个字。' };
  }
  if (
    [
      '我没想明白的是……',
      '如果……会怎么样？',
      '我不同意的一点是……',
      '我想请有经验的人聊聊……',
    ].includes(question)
  ) {
    return { ok: false, error: '把省略号换成你真正想问的那一点。' };
  }
  if (context.length > 5000) {
    return { ok: false, error: '背景请控制在 5000 个字以内。' };
  }
  if (boundaries && boundaries.length > 2000) {
    return { ok: false, error: '边界说明请控制在 2000 字以内。' };
  }
  if (otherAvailability && otherAvailability.length > 500) {
    return { ok: false, error: '其他时间请控制在 500 字以内。' };
  }
  return {
    ok: true,
    value: {
      name: name || '匿名星友',
      email: email || null,
      question,
      context,
      boundaries,
      availableDates,
      otherAvailability,
    },
  };
};
