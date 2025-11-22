import { supabase } from '../../database/supabase'
import { getCommonHttpHeader } from '../../utils/http'

export async function handler(event: any, context: any) {
  const headers = getCommonHttpHeader()
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }
  try {
    switch (event.httpMethod) {
      case 'GET':
        return await listUsers(event, headers)
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

async function listUsers(event: any, headers: Record<string, string>) {
  const params = event.queryStringParameters || {}
  const { q = '', limit = '50', offset = '0', offering = '', seeking = '', interest = '', expertise = '', theme = '', city = '', id = '', ids = '' } = params

  // 当有画像筛选时，先筛选 user_profiles，得到 user_id 集合
  let filteredUserIds: Array<number | string> | null = null
  if (ids) {
    const list = String(ids)
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
      .map((x) => (isNaN(Number(x)) ? x : Number(x)))
    if (list.length > 0) filteredUserIds = list
  } else if (id) {
    const parsedId = isNaN(Number(id)) ? id : Number(id)
    filteredUserIds = [parsedId]
  }
  if (offering || seeking || interest || expertise || theme || city) {
    let profileQuery = supabase.from('user_profiles').select('user_id')
    if (offering) profileQuery = profileQuery.contains('offerings', [String(offering)])
    if (seeking) profileQuery = profileQuery.contains('seeking', [String(seeking)])
    if (interest) profileQuery = profileQuery.contains('interests', [String(interest)])
    if (expertise) profileQuery = profileQuery.contains('expertise', [String(expertise)])
    if (city) profileQuery = profileQuery.eq('city', String(city))
    let profilesIds: Array<number | string> = []
    const { data: profiles, error: pErr } = await profileQuery
    if (pErr) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: pErr.message }) }
    }
    profilesIds = (profiles || []).map((p: any) => p.user_id)
    if (theme) {
      const [pi, pe] = await Promise.all([
        supabase.from('user_profiles').select('user_id').contains('interests', [String(theme)]),
        supabase.from('user_profiles').select('user_id').contains('expertise', [String(theme)])
      ])
      const idsOr = [
        ...((pi.data || []).map((p: any) => p.user_id)),
        ...((pe.data || []).map((p: any) => p.user_id)),
      ]
      const set = new Set<string | number>([...profilesIds, ...idsOr])
      filteredUserIds = Array.from(set)
    } else {
      filteredUserIds = profilesIds
    }
    if (filteredUserIds.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, users: [] }) }
    }
  }

  // 查询用户基本信息
  let query = supabase.from('users').select('id, name, username')
  if (q) {
    const qLower = String(q).toLowerCase()
    query = query.or(`name.ilike.%${qLower}%,username.ilike.%${qLower}%`)
  }
  if (filteredUserIds) {
    query = query.in('id', filteredUserIds as any)
  }
  const { data: users, error } = await query
    .order('name', { ascending: true })
    .range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10) - 1)
  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) }
  }

  const userIds = (users || []).map((u: any) => u.id)
  let profilesByUserId: Record<string, any> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, bio, interests, expertise, availability_text, wechat_id, city, offerings, seeking')
      .in('user_id', userIds as any)
    ;(profiles || []).forEach((p: any) => { profilesByUserId[String(p.user_id)] = p })
  }

  const merged = (users || []).map((u: any) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    profile: profilesByUserId[String(u.id)] || null,
  }))

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, users: merged }) }
}