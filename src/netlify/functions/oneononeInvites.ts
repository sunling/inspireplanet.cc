import { supabase } from '../../database/supabase'
import { getCommonHttpHeader } from '../../utils/http'
import jwt from 'jsonwebtoken'
import { createNotification } from './notifications'

const JWT_SECRET = process.env.JWT_SECRET as string

function getUserIdFromAuth(event: any) {
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

export async function handler(event: any, context: any) {
  const headers = getCommonHttpHeader()
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }
  try {
    switch (event.httpMethod) {
      case 'POST':
        return await createInvite(event, headers)
      case 'GET':
        return await listInvites(event, headers)
      case 'PUT':
        return await updateInvite(event, headers)
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ success: false, error: 'Method Not Allowed' }),
        }
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Server Error' }),
    }
  }
}

async function createInvite(event: any, headers: Record<string, string>) {
  const userId = getUserIdFromAuth(event)
  if (!userId) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ success: false, error: 'Unauthorized' }),
    }
  }
  if (!event.body) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Empty body' }),
    }
  }
  const data = JSON.parse(event.body)
  const invitee_id = data.invitee_id
  const message = data.message || ''
  const proposed_slots = Array.isArray(data.proposed_slots) ? data.proposed_slots : []
  if (!invitee_id || proposed_slots.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Missing fields' }),
    }
  }
  const now = Date.now()
  const validSlots = proposed_slots.filter((s: any) => {
    const t = new Date(s.datetime_iso).getTime()
    const m = s.mode === 'online' || s.mode === 'offline'
    return !isNaN(t) && t > now && m
  })
  if (validSlots.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid slots' }),
    }
  }
  const { data: inserted, error } = await supabase
    .from('one_on_one_invites')
    .insert({ inviter_id: userId, invitee_id, message, proposed_slots, status: 'pending' })
    .select()
  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
  const inv = inserted?.[0]
  if (inv) await createNotification(invitee_id, '收到邀请', '你收到一条一对一邀请', '/connections')
  return { statusCode: 200, headers, body: JSON.stringify({ success: true, invite: inserted?.[0] || null }) }
}

async function listInvites(event: any, headers: Record<string, string>) {
  const userId = getUserIdFromAuth(event)
  if (!userId) {
    return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Unauthorized' }) }
  }
  const params = event.queryStringParameters || {}
  const role = params.role || 'invitee'
  const status = params.status || ''
  let query = supabase.from('one_on_one_invites').select('*')
  if (role === 'inviter') query = query.eq('inviter_id', userId)
  else query = query.eq('invitee_id', userId)
  if (status) query = query.eq('status', status)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
  return { statusCode: 200, headers, body: JSON.stringify({ success: true, invites: data || [] }) }
}

async function updateInvite(event: any, headers: Record<string, string>) {
  const userId = getUserIdFromAuth(event)
  if (!userId) {
    return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Unauthorized' }) }
  }
  const params = event.queryStringParameters || {}
  let { id } = params as any
  const payloadRaw = event.body ? JSON.parse(event.body) : {}
  if (!id && payloadRaw && payloadRaw.id) id = payloadRaw.id
  if (!id || !event.body) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Missing params' }) }
  }
  const payload = payloadRaw
  const nextStatus = payload.status
  const selected_slot = payload.selected_slot || null
  const { data: existing, error: fetchError } = await supabase
    .from('one_on_one_invites')
    .select('*')
    .eq('id', id)
    .single()
  if (fetchError || !existing) {
    return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Not Found' }) }
  }
  const isInvitee = existing.invitee_id === userId
  const isInviter = existing.inviter_id === userId
  if (!isInvitee && !isInviter) {
    return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Forbidden' }) }
  }
  const allowed = ['pending', 'accepted', 'declined', 'cancelled']
  if (!allowed.includes(nextStatus)) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid status' }) }
  }
  const updateRecord: Record<string, any> = { status: nextStatus }
  if (nextStatus === 'accepted' && selected_slot) updateRecord.selected_slot = selected_slot
  const { data, error } = await supabase
    .from('one_on_one_invites')
    .update(updateRecord)
    .eq('id', id)
    .select()
  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }
  const updated = data?.[0]
  if (updated) {
    if (nextStatus === 'accepted') {
      await createNotification(updated.inviter_id, '邀请已接受', '对方已接受你的邀请', '/connections')
      await createNotification(updated.invitee_id, '你已接受邀请', '已生成会面记录', '/connections')
    } else if (nextStatus === 'declined') {
      await createNotification(updated.inviter_id, '邀请被拒绝', '对方拒绝了你的邀请', '/connections')
    } else if (nextStatus === 'cancelled') {
      await createNotification(isInvitee ? updated.inviter_id : updated.invitee_id, '邀请已取消', '对方取消了邀请', '/connections')
    }
  }
  return { statusCode: 200, headers, body: JSON.stringify({ success: true, invite: data?.[0] || null }) }
}