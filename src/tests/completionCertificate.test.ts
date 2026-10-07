import { describe, expect, it } from 'vitest';
import {
  buildRecordSummary,
  createCertificateSvg,
  escapeCertificateHtml,
  formatCertificateDate,
  wrapCertificateText,
} from '../utils/completionCertificate';

describe('completion certificate', () => {
  it('formats dates and optional record stats', () => {
    expect(formatCertificateDate('2026-09-01')).toBe('2026.09.01');
    expect(buildRecordSummary(18, 26)).toBe('你留下了 18 天、26 篇 生活记录。');
    expect(buildRecordSummary(null, null)).toBeNull();
  });

  it('escapes user-controlled content in the SVG attachment', () => {
    expect(escapeCertificateHtml('<script>"x"</script>')).toBe(
      '&lt;script&gt;&quot;x&quot;&lt;/script&gt;'
    );
    const svg = createCertificateSvg({
      activityName: '<一个月>',
      participantName: '抹茶 & friends',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      completionDate: '2026-09-30',
      completionMessage: '谢谢记录',
      organizer: '抹茶',
      community: '启发星球',
      activityEdition: '第二期',
    });
    expect(svg).toContain('&lt;一个月&gt;');
    expect(svg).toContain('抹茶 &amp; friends');
    expect(svg).toContain('第二期');
    expect(svg).not.toContain('<一个月>');
  });

  it('wraps and truncates long certificate copy safely', () => {
    expect(wrapCertificateText('一二三四五六七八', 3, 2)).toEqual([
      '一二三',
      '四五…',
    ]);
    expect(wrapCertificateText('  hello  ', 10, 2)).toEqual(['hello']);
    expect(wrapCertificateText('', 10, 2)).toEqual([]);

    const svg = createCertificateSvg({
      activityName: '这是一个名字特别特别长的活动'.repeat(4),
      participantName: '参与者',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      completionDate: '2026-09-30',
      completionMessage: '这是一段很长的结营文字'.repeat(8),
      reflection: '一段很长的回顾'.repeat(12),
      organizer: '抹茶',
      community: '启发星球',
    });
    expect(svg).toContain('<tspan');
    expect(svg).toContain('…');
    expect(svg).not.toContain('这是一段很长的结营文字'.repeat(8));
  });
});
