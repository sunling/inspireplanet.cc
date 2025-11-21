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
        return await createMeeting(event, headers)
      case 'GET':
        return await listMeetings(event, headers)
      case 'PUT':
        return await updateMeeting(event, headers)
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ success: false, error: 'Method Not Allowed' }),
        }
    }
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Server Error' }) }
  }
}

async function createMeeting(event: any, headers: Record<string, string>) {
  const userId = getUserIdFromAuth(event)
  if (!userId) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Unauthorized' }) }
  if (!event.body) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Empty body' }) }
  const payload = JSON.parse(event.body)
  const { invite_id, final_datetime_iso, mode, location_text = null, meeting_url = null, notes = '' } = payload
  if (!invite_id || !final_datetime_iso || !mode) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Missing fields' }) }
  }
  const t = new Date(final_datetime_iso).getTime()
  if (isNaN(t) || t <= Date.now()) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid time' }) }
  }
  const m = mode === 'online' || mode === 'offline'
  if (!m) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid mode' }) }
  const { data: invite, error: inviteError } = await supabase
    .from('one_on_one_invites')
    .select('id, inviter_id, invitee_id, status')
    .eq('id', invite_id)
    .single()
  if (inviteError || !invite) {
    return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Invite Not Found' }) }
  }
  if (invite.inviter_id !== userId && invite.invitee_id !== userId) {
    return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Forbidden' }) }
  }
  const { data: inserted, error } = await supabase
    .from('one_on_one_meetings')
    .insert({ invite_id, final_datetime_iso, mode, location_text, meeting_url, notes, status: 'scheduled' })
    .select()
  if (error) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  await supabase.from('one_on_one_invites').update({ status: 'accepted' }).eq('id', invite_id)
  await createNotification(invite.inviter_id, '会面已安排', '对方已确认会面时间', '/connections')
  await createNotification(invite.invitee_id, '会面已安排', '会面时间已确认', '/connections')
  return { statusCode: 200, headers, body: JSON.stringify({ success: true, meeting: inserted?.[0] || null }) }
}

async function listMeetings(event: any, headers: Record<string, string>) {
  const userId = getUserIdFromAuth(event)
  if (!userId) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Unauthorized' }) }
  const { data, error } = await supabase
    .from('one_on_one_meetings')
    .select('*, one_on_one_invites!inner(inviter_id, invitee_id)')
    .order('created_at', { ascending: false })
  if (error) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  const filtered = (data || []).filter((m: any) => {
    const inv = (m as any).one_on_one_invites
    return inv && (inv.inviter_id === userId || inv.invitee_id === userId)
  })
  return { statusCode: 200, headers, body: JSON.stringify({ success: true, meetings: filtered }) }
}

async function updateMeeting(event: any, headers: Record<string, string>) {
  const userId = getUserIdFromAuth(event)
  if (!userId) return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Unauthorized' }) }

  const params = event.queryStringParameters || {}
  let { id } = params as any
  const payload = event.body ? JSON.parse(event.body) : {}
  if (!id && payload && payload.id) id = payload.id
  if (!id) return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Missing meeting id' }) }

  const { data: meeting, error: fetchError } = await supabase
    .from('one_on_one_meetings')
    .select('id, invite_id, final_datetime_iso, mode, meeting_url, location_text, status')
    .eq('id', id)
    .single()
  if (fetchError || !meeting) return { statusCode: 404, headers, body: JSON.stringify({ success: false, error: 'Meeting Not Found' }) }

  const { data: invite } = await supabase
    .from('one_on_one_invites')
    .select('inviter_id, invitee_id')
    .eq('id', meeting.invite_id)
    .single()
  if (!invite || (invite.inviter_id !== userId && invite.invitee_id !== userId)) {
    return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Forbidden' }) }
  }

  const updateRecord: Record<string, any> = {}
  if (payload.final_datetime_iso) {
    const t = new Date(payload.final_datetime_iso).getTime()
    if (isNaN(t) || t <= Date.now()) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid time' }) }
    }
    updateRecord.final_datetime_iso = new Date(payload.final_datetime_iso).toISOString()
  }
  if (payload.mode) {
    if (!(payload.mode === 'online' || payload.mode === 'offline')) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid mode' }) }
    }
    updateRecord.mode = payload.mode
  }
  if (payload.meeting_url !== undefined) updateRecord.meeting_url = payload.meeting_url || null
  if (payload.location_text !== undefined) updateRecord.location_text = payload.location_text || null
  if (payload.notes !== undefined) updateRecord.notes = payload.notes || null
  if (payload.status) {
    const allowed = ['scheduled', 'completed', 'cancelled']
    if (!allowed.includes(payload.status)) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Invalid status' }) }
    }
    updateRecord.status = payload.status
  }

  const { data: updated, error } = await supabase
    .from('one_on_one_meetings')
    .update(updateRecord)
    .eq('id', id)
    .select()
  if (error) return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  if (updateRecord.status === 'cancelled') {
    await supabase
      .from('one_on_one_invites')
      .update({ status: 'cancelled' })
      .eq('id', meeting.invite_id)
    await createNotification(invite.inviter_id, '会面已取消', '对方取消了会面', '/connections')
    await createNotification(invite.invitee_id, '会面已取消', '会面已取消', '/connections')
  } else {
    if (updateRecord.final_datetime_iso || updateRecord.mode || updateRecord.meeting_url || updateRecord.location_text) {
      await createNotification(invite.inviter_id, '会面信息更新', '会面信息已更新', '/connections')
      await createNotification(invite.invitee_id, '会面信息更新', '会面信息已更新', '/connections')
    }
    if (updateRecord.status === 'completed') {
      await createNotification(invite.inviter_id, '会面已完成', '会面已标记完成', '/connections')
      await createNotification(invite.invitee_id, '会面已完成', '会面已标记完成', '/connections')
    }
  }
  return { statusCode: 200, headers, body: JSON.stringify({ success: true, meeting: updated?.[0] || null }) }
}