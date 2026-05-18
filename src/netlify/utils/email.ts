import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@inspireplanet.cc';
const SITE_URL = process.env.URL || 'https://inspireplanet.cc';

interface RSVPConfirmParams {
  to: string;
  name: string;
  meetupTitle: string;
  meetupId: number;
  eventDatetime: string; // UTC ISO string
  durationHours?: number;
  location?: string | null;
  mode?: string;
  episodeNumber?: number;
  timezone?: string;
}

function formatInTimezone(
  date: Date,
  timezone: string
): { dateStr: string; timeStr: string; tzLabel: string } {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  // Get all parts in one call
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const wdMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const wdNum = wdMap[get('weekday').slice(0, 3)] ?? 0;

  const h = get('hour').padStart(2, '0');
  const min = get('minute').padStart(2, '0');

  const dateStr = `${get('year')}年${get('month')}月${get('day')}日 ${weekdays[wdNum]}`;
  const timeStr = `${h}:${min}`;

  // Show friendly label for common timezones
  const tzLabels: Record<string, string> = {
    'Asia/Shanghai': '北京时间',
    'Asia/Hong_Kong': '香港时间',
    'America/Los_Angeles': 'PT',
    'America/New_York': 'ET',
    'America/Chicago': 'CT',
    'America/Denver': 'MT',
    'Europe/London': 'GMT',
    'Europe/Paris': 'CET',
    'Asia/Tokyo': '东京时间',
  };

  return { dateStr, timeStr, tzLabel: tzLabels[timezone] ?? timezone };
}

function generateICS(params: RSVPConfirmParams): string {
  const {
    meetupTitle,
    meetupId,
    eventDatetime,
    durationHours = 1,
    location,
    episodeNumber,
  } = params;
  const start = new Date(eventDatetime);
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');

  const escape = (s: string) =>
    s.replace(/[,;\\]/g, (c) => '\\' + c).replace(/\n/g, '\\n');

  const title = episodeNumber
    ? `${meetupTitle} EP${episodeNumber}`
    : meetupTitle;
  const url = `${SITE_URL}/meetup-detail?id=${meetupId}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//启发星球//inspireplanet.cc//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${escape(title)}`,
    location ? `LOCATION:${escape(location)}` : '',
    `URL:${url}`,
    `UID:inspireplanet-meetup-${meetupId}-${start.getTime()}@inspireplanet.cc`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

export async function sendRSVPConfirmEmail(params: RSVPConfirmParams) {
  const {
    to,
    name,
    meetupTitle,
    meetupId,
    eventDatetime,
    location,
    mode,
    episodeNumber,
    timezone = 'Asia/Shanghai',
  } = params;

  const date = new Date(eventDatetime);
  const { dateStr, timeStr, tzLabel } = formatInTimezone(date, timezone);

  const titleLine = episodeNumber
    ? `${meetupTitle} EP${episodeNumber}`
    : meetupTitle;
  const locationLine =
    mode === 'offline' && location
      ? location
      : mode === 'online'
        ? '线上（会议链接见活动详情）'
        : location || '待定';

  const detailUrl = `${SITE_URL}/meetup-detail?id=${meetupId}`;

  const html = `
<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'PingFang SC',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:#ff6348;padding:28px 32px;">
            <p style="margin:0;color:#fff;font-size:13px;opacity:0.85;">启发星球 · Inspire Planet</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">报名确认 🎉</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;font-size:15px;color:#333;">你好，<strong>${name}</strong>！</p>
            <p style="margin:0 0 20px;font-size:15px;color:#333;">你已成功报名以下活动，期待与你相见 👋</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f6;border:1px solid #ffd6ce;border-radius:10px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <h2 style="margin:0 0 16px;font-size:17px;color:#ff6348;">${titleLine}</h2>
                <p style="margin:0 0 8px;font-size:14px;color:#555;">
                  📅 <strong>时间：</strong>${dateStr} ${timeStr}（${tzLabel}）
                </p>
                <p style="margin:0;font-size:14px;color:#555;">
                  📍 <strong>地点：</strong>${locationLine}
                </p>
              </td></tr>
            </table>
            <p style="margin:0 0 24px;font-size:14px;color:#666;">
              邮件附件中已包含日历文件（.ics），可直接添加到你的日历应用。
            </p>
            <a href="${detailUrl}" style="display:inline-block;background:#ff6348;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">查看活动详情</a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;">
            <p style="margin:0 0 6px;font-size:13px;color:#999;">关注公众号「启发星球笔记」了解社群最新动态</p>
            <p style="margin:0;font-size:12px;color:#bbb;">此邮件由系统自动发送，请勿直接回复</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const icsContent = generateICS(params);
  const filename = `${titleLine.replace(/\s+/g, '-')}.ics`;

  try {
    await resend.emails.send({
      from: `启发星球 <${FROM}>`,
      to,
      subject: `报名确认：${titleLine}`,
      html,
      attachments: [
        { filename, content: Buffer.from(icsContent).toString('base64') },
      ],
    });
  } catch (err) {
    console.error('发送确认邮件失败:', err);
  }
}

interface SpeakerConfirmParams extends RSVPConfirmParams {
  topic: string;
  duration?: string;
}

export async function sendSpeakerConfirmEmail(params: SpeakerConfirmParams) {
  const {
    to,
    name,
    topic,
    duration,
    meetupTitle,
    meetupId,
    eventDatetime,
    location,
    mode,
    episodeNumber,
    timezone = 'Asia/Shanghai',
  } = params;

  const date = new Date(eventDatetime);
  const { dateStr, timeStr, tzLabel } = formatInTimezone(date, timezone);

  const titleLine = episodeNumber
    ? `${meetupTitle} EP${episodeNumber}`
    : meetupTitle;
  const locationLine =
    mode === 'offline' && location
      ? location
      : mode === 'online'
        ? '线上（会议链接见活动详情）'
        : location || '待定';
  const detailUrl = `${SITE_URL}/meetup-detail?id=${meetupId}`;

  const html = `
<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'PingFang SC',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:#ff6348;padding:28px 32px;">
            <p style="margin:0;color:#fff;font-size:13px;opacity:0.85;">启发星球 · Inspire Planet</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">分享报名确认 🎤</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;font-size:15px;color:#333;">你好，<strong>${name}</strong>！</p>
            <p style="margin:0 0 20px;font-size:15px;color:#333;">你已成功报名在以下活动中分享，期待你的精彩内容 🌟</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f6;border:1px solid #ffd6ce;border-radius:10px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <h2 style="margin:0 0 16px;font-size:17px;color:#ff6348;">${titleLine}</h2>
                <p style="margin:0 0 8px;font-size:14px;color:#555;">
                  📅 <strong>时间：</strong>${dateStr} ${timeStr}（${tzLabel}）
                </p>
                <p style="margin:0 0 8px;font-size:14px;color:#555;">
                  📍 <strong>地点：</strong>${locationLine}
                </p>
                <p style="margin:0 0 8px;font-size:14px;color:#555;">
                  💡 <strong>你的主题：</strong>${topic}
                </p>
                ${duration ? `<p style="margin:0;font-size:14px;color:#555;">⏱️ <strong>预计时长：</strong>${duration}</p>` : ''}
              </td></tr>
            </table>
            <p style="margin:0 0 24px;font-size:14px;color:#666;">如有任何问题，请通过公众号「启发星球笔记」联系我们。</p>
            <a href="${detailUrl}" style="display:inline-block;background:#ff6348;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">查看活动详情</a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;">
            <p style="margin:0 0 6px;font-size:13px;color:#999;">关注公众号「启发星球笔记」了解社群最新动态</p>
            <p style="margin:0;font-size:12px;color:#bbb;">此邮件由系统自动发送，请勿直接回复</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const icsContent = generateICS(params);
  const filename = `${titleLine.replace(/\s+/g, '-')}.ics`;

  try {
    await resend.emails.send({
      from: `启发星球 <${FROM}>`,
      to,
      subject: `分享报名确认：${titleLine}`,
      html,
      attachments: [
        { filename, content: Buffer.from(icsContent).toString('base64') },
      ],
    });
  } catch (err) {
    console.error('发送分享确认邮件失败:', err);
  }
}

interface RSVPRejectParams {
  to: string;
  name: string;
  meetupTitle: string;
  meetupId: number;
}

export async function sendRSVPRejectEmail(params: RSVPRejectParams) {
  const { to, name, meetupTitle, meetupId } = params;
  const activityListUrl = `${SITE_URL}/meetups`;

  const html = `
<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'PingFang SC',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:#1e40af;padding:28px 32px;">
            <p style="margin:0;color:#fff;font-size:13px;opacity:0.85;">启发星球 · Inspire Planet</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">报名结果通知</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;font-size:15px;color:#333;">你好，<strong>${name}</strong>！</p>
            <p style="margin:0 0 20px;font-size:15px;color:#333;">很遗憾，你报名的活动<strong>${meetupTitle}</strong>，暂时与您无缘，感谢你的理解与支持 🙏</p>
            <p style="margin:0 0 24px;font-size:14px;color:#666;">期待下次活动与你相见！</p>
            <a href="${activityListUrl}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">浏览更多活动</a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f0f0f0;">
            <p style="margin:0 0 6px;font-size:13px;color:#999;">关注公众号「启发星球笔记」了解社群最新动态</p>
            <p style="margin:0;font-size:12px;color:#bbb;">此邮件由系统自动发送，请勿直接回复</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: `启发星球 <${FROM}>`,
      to,
      subject: `报名结果：${meetupTitle}`,
      html,
    });
  } catch (err) {
    console.error('发送拒绝邮件失败:', err);
  }
}
