import { supabase } from '../../database/supabase'
import { getCommonHttpHeader } from '../../utils/http'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET as string

function getUserId(event: any) {
  const auth = event.headers.authorization || event.headers.Authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  const token = auth.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded.userId || decoded.user_id || null
  } catch {
    return null
  }
}

export async function handler(event: any) {
  const headers = getCommonHttpHeader()
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }
  try {
    switch (event.httpMethod) {
      case 'GET':
        return await listNotifications(event, headers)
      case 'PUT':
        return await updateNotification(event, headers)
      default:
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) }
    }
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server Error' }) }
  }
}

async function listNotifications(event: any, headers: Record<string, string>) {
  const userId = getUserId(event)
  if (!userId) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Unauthorized' }) }
  const params = event.queryStringParameters || {}
  const { status, limit = '50', offset = '0' } = params
  let query = supabase.from('notifications').select('*').eq('user_id', isNaN(Number(userId)) ? userId : Number(userId))
  if (status) query = query.eq('status', status)
  const { data, error } = await query.order('created_at', { ascending: false }).range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10) - 1)
  if (error) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  return { statusCode: 200, headers, body: JSON.stringify({ success: true, notifications: data || [] }) }
}

async function updateNotification(event: any, headers: Record<string, string>) {
  const userId = getUserId(event)
  if (!userId) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Unauthorized' }) }
  const params = event.queryStringParameters || {}
  const payload = event.body ? JSON.parse(event.body) : {}
  const id = params.id || payload.id || null
  const markAll = params.all === 'true' || payload.all === true
  const uid = isNaN(Number(userId)) ? userId : Number(userId)
  if (markAll) {
    const { error } = await supabase.from('notifications').update({ status: 'read' }).eq('user_id', uid).eq('status', 'unread')
    if (error) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
  }
  if (!id) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Missing id' }) }
  const { error } = await supabase.from('notifications').update({ status: 'read' }).eq('id', id).eq('user_id', uid)
  if (error) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
}

export async function createNotification(userId: string | number, title: string, content: string, path?: string) {
  const uid = isNaN(Number(userId)) ? userId : Number(userId)
  const { error } = await supabase
    .from('notifications')
    .insert({ user_id: uid, title, content, status: 'unread', path: path || null })
    .select()
  if (error) {
    console.error('[notifications] insert failed:', error.message)
    return
  }
  try {
    const { data: user } = await supabase
      .from('users')
      .select('email, name, username')
      .eq('id', uid)
      .single()
    const to = user?.email
    if (!to) return
    const subject = title
    const base = process.env.PUBLIC_BASE_URL || ''
    const link = path ? (base ? `${base}${path}` : path) : ''
    const name = user?.name || (user?.username ? `@${user.username}` : '')
    const text = [
      name ? `${name}，您好！` : '您好！',
      '',
      content,
      link ? `前往：${link}` : '',
      '',
      '此邮件由系统发送，如有打扰请忽略。'
    ].filter(Boolean).join('\n')
    await sendEmail(to, subject, text)
  } catch {}
}

async function sendEmail(to: string, subject: string, text: string) {
  const resendKey = process.env.RESEND_API_KEY
  const sendgridKey = process.env.SENDGRID_API_KEY
  try {
    if (resendKey) {
      const from = process.env.EMAIL_FROM || 'onboarding@resend.dev'
      console.log('[notifications] sending via Resend to:', to, 'from:', from)
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to, subject, text })
      })
      if (!res.ok) {
        const body = await res.text()
        console.error('Resend email failed:', res.status, body)
      }
      return
    }
    if (sendgridKey) {
      const from = process.env.EMAIL_FROM || 'no-reply@inspireplanet.cc'
      console.log('[notifications] sending via SendGrid to:', to, 'from:', from)
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: from },
          subject,
          content: [{ type: 'text/plain', value: text }],
        })
      })
      if (!res.ok) {
        const body = await res.text()
        console.error('SendGrid email failed:', res.status, body)
      }
      return
    }
    console.warn('[notifications] no email provider configured: set RESEND_API_KEY or SENDGRID_API_KEY')
  } catch (e) {
    console.error('sendEmail error:', e)
  }
}
