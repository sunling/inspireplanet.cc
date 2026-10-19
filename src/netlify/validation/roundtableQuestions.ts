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
  { ok: true; value: RoundtableQuestionInput } | { ok: false; error: string };

const normalizeText = (value: unknown) => String(value || '').trim();

export const normalizeRoundtableSessionDate = (value: unknown) => {
  const date = normalizeText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
    ? date
    : null;
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

// Session linkage is independent of a submitter's available dates. Episodes may
// be virtual until their first RSVP, so link by episode number + session year.
export const validateRoundtableSession = (input: Record<string, unknown>) => {
  const rawDate = normalizeText(input.sessionDate);
  const rawEpisode = normalizeText(input.episodeNumber);
  const sessionDate = normalizeRoundtableSessionDate(rawDate);
  const episodeNumber = /^\d+$/.test(rawEpisode) ? Number(rawEpisode) : null;
  if (rawDate && !sessionDate)
    return { ok: false as const, error: '请选择有效的展开日期。' };
  if (
    rawEpisode &&
    (!Number.isSafeInteger(episodeNumber) ||
      !episodeNumber ||
      episodeNumber > 999)
  )
    return { ok: false as const, error: '期数需为 1–999 的整数。' };
  if (Boolean(sessionDate) !== Boolean(episodeNumber))
    return { ok: false as const, error: '请同时填写展开日期和关联期数。' };
  if (['scheduled', 'completed'].includes(String(input.status)) && !sessionDate)
    return {
      ok: false as const,
      error: '安排或标记已展开时，请填写日期和关联期数。',
    };
  if (input.status === 'completed' && sessionDate) {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    if (sessionDate > today)
      return { ok: false as const, error: '未来场次请先标记为已安排。' };
  }
  return { ok: true as const, sessionDate, episodeNumber };
};
