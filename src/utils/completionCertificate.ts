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

export function createCertificateSvg(data: CompletionCertificateData): string {
  const esc = escapeCertificateHtml;
  const summary = buildRecordSummary(data.recordDays, data.recordCount);
  const meta = [data.activityEdition, data.certificateNumber]
    .filter(Boolean)
    .join(' · ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="848" viewBox="0 0 1200 848">
  <rect width="1200" height="848" fill="#f5efe4"/>
  <rect x="34" y="34" width="1132" height="780" rx="10" fill="#fffdf8" stroke="#c95438" stroke-width="2"/>
  <rect x="50" y="50" width="1100" height="748" rx="6" fill="none" stroke="#d9b778"/>
  <circle cx="103" cy="101" r="28" fill="#c95438"/><text x="103" y="110" text-anchor="middle" font-size="24" fill="#fffdf8" font-family="serif">启</text>
  <text x="1095" y="102" text-anchor="end" font-size="16" letter-spacing="3" fill="#8c735c" font-family="sans-serif">INSPIRE PLANET</text>
  <text x="600" y="190" text-anchor="middle" font-size="22" letter-spacing="9" fill="#b14834" font-family="sans-serif">COMPLETION CERTIFICATE</text>
  <text x="600" y="246" text-anchor="middle" font-size="42" font-weight="700" fill="#352b24" font-family="serif">结 营 证 书</text>
  <line x1="450" y1="270" x2="750" y2="270" stroke="#d9b778"/>
  <text x="600" y="332" text-anchor="middle" font-size="27" fill="#6f5c4d" font-family="serif">${esc(data.activityName)}</text>
  <text x="600" y="408" text-anchor="middle" font-size="48" font-weight="700" fill="#b14834" font-family="serif">${esc(data.participantName)}</text>
  <text x="600" y="454" text-anchor="middle" font-size="18" letter-spacing="2" fill="#8c735c" font-family="sans-serif">${esc(formatCertificateDate(data.startDate))}  —  ${esc(formatCertificateDate(data.endDate))}</text>
  ${summary ? `<text x="600" y="512" text-anchor="middle" font-size="22" fill="#55463b" font-family="serif">${esc(summary)}</text>` : ''}
  <text x="600" y="574" text-anchor="middle" font-size="25" font-weight="700" fill="#352b24" font-family="serif">${esc(data.completionMessage)}</text>
  ${data.reflection ? `<text x="600" y="623" text-anchor="middle" font-size="20" fill="#8c735c" font-family="serif">「${esc(data.reflection)}」</text>` : ''}
  <line x1="210" y1="685" x2="990" y2="685" stroke="#eadfce"/>
  <text x="210" y="727" font-size="17" fill="#6f5c4d" font-family="sans-serif">活动发起人 · ${esc(data.organizer)}</text>
  <text x="600" y="727" text-anchor="middle" font-size="17" fill="#6f5c4d" font-family="sans-serif">${esc(data.community)} · ${esc(formatCertificateDate(data.completionDate))}</text>
  <text x="990" y="727" text-anchor="end" font-size="15" fill="#9a8879" font-family="sans-serif">${esc(meta)}</text>
</svg>`;
}
