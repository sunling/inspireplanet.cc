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
  await supabase.from('notifications').insert({ user_id: uid, title, content, status: 'unread', path: path || null }).select()
}