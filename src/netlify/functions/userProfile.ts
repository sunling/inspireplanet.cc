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
        return await getMyProfile(event, headers)
      case 'POST':
        return await upsertMyProfile(event, headers)
      default:
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'Method Not Allowed' }) }
    }
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server Error' }) }
  }
}

async function getMyProfile(event: any, headers: Record<string, string>) {
  const userId = getUserId(event)
  if (!userId) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Unauthorized' }) }
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error && error.code !== 'PGRST116') {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
  return { statusCode: 200, headers, body: JSON.stringify({ success: true, profile: data || null }) }
}

async function upsertMyProfile(event: any, headers: Record<string, string>) {
  const userId = getUserId(event)
  if (!userId) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Unauthorized' }) }
  if (!event.body) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Empty body' }) }
  const payload = JSON.parse(event.body)
  const record: Record<string, any> = {
    bio: payload.bio ?? null,
    interests: Array.isArray(payload.interests) ? payload.interests : null,
    expertise: Array.isArray(payload.expertise) ? payload.expertise : null,
    availability_text: payload.availability_text ?? null,
    timezone: payload.timezone ?? null,
    wechat_id: payload.wechat_id ?? null,
  }
  const uid = isNaN(Number(userId)) ? userId : Number(userId)
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', uid)
    .single()
  if (existing) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(record)
      .eq('user_id', uid)
      .select()
    if (error) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, profile: data?.[0] || null }) }
  } else {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({ user_id: uid, ...record })
      .select()
    if (error) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, profile: data?.[0] || null }) }
  }
}