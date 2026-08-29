export interface RoundtableQuestionInput {
  name: string;
  email: string;
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

  if (!name || name.length > 80) {
    return { ok: false, error: '称呼需为 1–80 个字。' };
  }
  if (
    !email ||
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { ok: false, error: '请填写有效的联系邮箱。' };
  }
  if (question.length < 5 || question.length > 500) {
    return { ok: false, error: '问题需为 5–500 个字。' };
  }
  if (context.length < 10 || context.length > 5000) {
    return { ok: false, error: '背景需为 10–5000 个字。' };
  }
  if (boundaries && boundaries.length > 2000) {
    return { ok: false, error: '边界说明请控制在 2000 字以内。' };
  }
  if (otherAvailability && otherAvailability.length > 500) {
    return { ok: false, error: '其他时间请控制在 500 字以内。' };
  }
  if (!availableDates.length && !otherAvailability) {
    return { ok: false, error: '请选择可参加的场次，或填写其他方便时间。' };
  }

  return {
    ok: true,
    value: {
      name,
      email,
      question,
      context,
      boundaries,
      availableDates,
      otherAvailability,
    },
  };
};
