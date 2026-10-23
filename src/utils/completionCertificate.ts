export interface CompletionCertificateData {
  activityName: string;
  participantName: string;
  startDate: string;
  endDate: string;
  recordDays?: number | null;
  recordCount?: number | null;
  completionMessage: string;
  reflection?: string;
  organizer: string;
  community: string;
  completionDate: string;
  certificateNumber?: string;
  activityEdition?: string;
}

export const DEFAULT_COMPLETION_MESSAGE = '谢谢你认真看见并记录了这一段生活。';

export function formatCertificateDate(value: string): string {
  if (!value) return '未设置';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : value;
}

export function buildRecordSummary(
  days?: number | null,
  count?: number | null
): string | null {
  const parts: string[] = [];
  if (typeof days === 'number' && days >= 0) parts.push(`${days} 天`);
  if (typeof count === 'number' && count >= 0) parts.push(`${count} 篇`);
  return parts.length ? `你留下了 ${parts.join('、')} 生活记录。` : null;
}

export function escapeCertificateHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function wrapCertificateText(
  value: unknown,
  maxCharacters: number,
  maxLines = 2
): string[] {
  const text = String(value ?? '').trim();
  if (!text || maxCharacters <= 0 || maxLines <= 0) return [];

  const characters = Array.from(text);
  const lines: string[] = [];
  for (let index = 0; index < characters.length && lines.length < maxLines; ) {
    lines.push(characters.slice(index, index + maxCharacters).join(''));
    index += maxCharacters;
  }

  if (characters.length > maxCharacters * maxLines) {
    const lastLine = Array.from(lines[lines.length - 1]);
    lastLine.splice(Math.max(0, lastLine.length - 1), 1, '…');
    lines[lines.length - 1] = lastLine.join('');
  }
  return lines;
}

function createSvgTextLines(
  value: unknown,
  options: {
    x?: number;
    y: number;
    maxCharacters: number;
    maxLines?: number;
    lineHeight: number;
    attributes: string;
    quote?: boolean;
  }
): string {
  const lines = wrapCertificateText(
    value,
    options.maxCharacters,
    options.maxLines
  );
  if (!lines.length) return '';
  const x = options.x ?? 600;
  const content = lines
    .map((line, index) => {
      const prefix = options.quote && index === 0 ? '「' : '';
      const suffix = options.quote && index === lines.length - 1 ? '」' : '';
      return `<tspan x="${x}" dy="${index === 0 ? 0 : options.lineHeight}">${escapeCertificateHtml(`${prefix}${line}${suffix}`)}</tspan>`;
    })
    .join('');
  return `<text x="${x}" y="${options.y}" ${options.attributes}>${content}</text>`;
}

export function createCertificateSvg(data: CompletionCertificateData): string {
  const esc = escapeCertificateHtml;
  const summary = buildRecordSummary(data.recordDays, data.recordCount);
  const isDense =
    Array.from(data.reflection || '').length +
      Array.from(data.completionMessage || '').length >
      70 || data.activityName.length > 28;
  const meta = data.certificateNumber || '';
  const activityLabel = data.activityEdition
    ? `${data.activityName}  ·  ${data.activityEdition}`
    : data.activityName;
  const activityHeading = createSvgTextLines(activityLabel, {
    y: 300,
    maxCharacters: 34,
    maxLines: 2,
    lineHeight: 28,
    attributes:
      'text-anchor="middle" font-size="24" fill="#6f5c4d" font-family="serif"',
  });
  const participantName = createSvgTextLines(data.participantName, {
    x: 990,
    y: 642,
    maxCharacters: 24,
    maxLines: 1,
    lineHeight: 0,
    attributes:
      'text-anchor="end" font-size="22" font-weight="700" fill="#55463b" font-family="serif"',
  });
  const completionMessage = createSvgTextLines(data.completionMessage, {
    y: 410,
    maxCharacters: 38,
    maxLines: 2,
    lineHeight: 25,
    attributes: `text-anchor="middle" font-size="${isDense ? 16 : 18}" fill="#6f5c4d" font-family="serif"`,
  });
  const reflection = data.reflection
    ? createSvgTextLines(data.reflection, {
        y: 474,
        maxCharacters: 32,
        maxLines: 4,
        lineHeight: isDense ? 28 : 32,
        attributes: `text-anchor="middle" font-size="${isDense ? 21 : 24}" fill="#b14834" font-family="serif"`,
      })
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="848" viewBox="0 0 1200 848">
  <rect width="1200" height="848" fill="#f5efe4"/>
  <rect x="34" y="34" width="1132" height="780" rx="10" fill="#fffdf8" stroke="#c95438" stroke-width="2"/>
  <rect x="50" y="50" width="1100" height="748" rx="6" fill="none" stroke="#d9b778"/>
  <circle cx="103" cy="101" r="28" fill="#c95438"/><text x="103" y="110" text-anchor="middle" font-size="24" fill="#fffdf8" font-family="serif">启</text>
  <text x="1095" y="102" text-anchor="end" font-size="16" letter-spacing="3" fill="#8c735c" font-family="sans-serif">INSPIRE PLANET</text>
  <text x="600" y="184" text-anchor="middle" font-size="20" letter-spacing="9" fill="#b14834" font-family="sans-serif">COMPLETION CERTIFICATE</text>
  <text x="600" y="238" text-anchor="middle" font-size="34" font-weight="700" fill="#352b24" font-family="serif">结 营 证 书</text>
  ${activityHeading}
  ${summary ? `<text x="600" y="378" text-anchor="middle" font-size="14" fill="#ad9a87" font-family="sans-serif">${esc(summary)}</text>` : ''}
  ${completionMessage}
  ${reflection}
  <text x="990" y="614" text-anchor="end" font-size="13" letter-spacing="2" fill="#ad9a87" font-family="sans-serif">结营留念</text>
  ${participantName}
  <text x="990" y="670" text-anchor="end" font-size="15" fill="#8c735c" font-family="sans-serif">${esc(formatCertificateDate(data.completionDate))}</text>
  <text x="210" y="727" font-size="17" fill="#6f5c4d" font-family="sans-serif">活动发起人 · ${esc(data.organizer)}</text>
  <text x="600" y="727" text-anchor="middle" font-size="17" fill="#6f5c4d" font-family="sans-serif">${esc(data.community)}</text>
  <text x="990" y="727" text-anchor="end" font-size="14" fill="#9a8879" font-family="sans-serif">${esc(formatCertificateDate(data.startDate))} — ${esc(formatCertificateDate(data.endDate))}</text>
  ${meta ? `<text x="990" y="770" text-anchor="end" font-size="13" fill="#9a8879" font-family="sans-serif">${esc(meta)}</text>` : ''}
</svg>`;
}
