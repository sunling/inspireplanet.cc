// netlify/functions/meetupHandler.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export async function handler(event, context) {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  }

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  try {
    switch (event.httpMethod) {
      case 'POST':
        return await createMeetup(event, headers)
      case 'GET':
        return await getMeetups(event, headers)
      case 'PUT':
        return await updateMeetup(event, headers)
      case 'DELETE':
        return await deleteMeetup(event, headers)
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method Not Allowed' })
        }
    }
  } catch (error) {
    console.error('Meetup handler error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '服务器内部错误' })
    }
  }
}

// 创建活动
async function createMeetup(event, headers) {
  try {
    const meetupData = JSON.parse(event.body)

    // 验证必填字段
     const { title, description, type, datetime, organizer, contact } = meetupData
     if (!title || !description || !type || !datetime || !organizer || !contact) {
       return {
         statusCode: 400,
         headers,
         body: JSON.stringify({ 
           success: false, 
           error: '缺少必填字段' 
         })
       }
     }

    // 验证日期格式
    const meetupDateTime = new Date(meetupData.datetime)
    if (isNaN(meetupDateTime.getTime())) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: '日期时间格式无效' 
        })
      }
    }
    
    if (meetupDateTime < new Date()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: '活动时间不能是过去的时间' 
        })
      }
    }

    // 插入到数据库
    const { data, error } = await supabase
      .from('meetups')
      .insert([
        {
          title,
          description,
          mode: type,
          datetime: meetupDateTime.toISOString(),
          location: meetupData.location?.trim() || null,
          duration: meetupData.duration || null,
          max_ppl: meetupData.maxParticipants || null,
          creator: organizer,
          wechat_id: contact,
          cover: meetupData.qrImageUrl || null,
          status: 'active',
          user_id: meetupData.createdBy || null
        }
      ])
      .select()

    if (error) {
      console.error('Database insert error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '创建活动失败',
          details: error.message
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '活动创建成功',
        meetup: data[0]
      })
    }

  } catch (error) {
    console.error('Create meetup error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '创建活动失败',
        details: error.message
      })
    }
  }
}

// 获取活动列表
async function getMeetups(event, headers) {
  try {
    const params = event.queryStringParameters || {}
    const { id, status = 'active', limit = 50, offset = 0 } = params

    let query = supabase.from('meetups').select('*')

    // 如果指定了ID，获取单个活动
    if (id) {
      query = query.eq('id', id)
    } else {
      // 获取活动列表
      query = query
        .eq('status', status)
        .order('datetime', { ascending: true })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Database query error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '获取活动失败',
          details: error.message
        })
      }
    }

    // 如果没有活动数据，直接返回
    if (!data || data.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, meetups: [] })
      }
    }

    // 计算报名人数，统一前端预期的字段命名
    try {
      const meetupIds = data.map(m => m.id).filter(Boolean)

      let countsByMeetupId = {}
      if (meetupIds.length > 0) {
        const { data: rsvps, error: rsvpsError } = await supabase
          .from('meetup_rsvps')
          .select('meetup_id')
          .in('meetup_id', meetupIds)
          .eq('status', 'confirmed')

        if (rsvpsError) {
          console.error('RSVP query error:', rsvpsError)
        } else if (rsvps && Array.isArray(rsvps)) {
          countsByMeetupId = rsvps.reduce((acc, r) => {
            const key = r.meetup_id
            acc[key] = (acc[key] || 0) + 1
            return acc
          }, {})
        }
      }

      // 规范化返回：兼容前端期望字段
      const normalized = data.map(m => ({
        ...m,
        // 前端 meetups.html 期望的字段
        type: m.type || m.mode || null,
        organizer: m.organizer || m.creator || null,
        contact: m.contact || m.wechat_id || null,
        qr_image_url: m.qr_image_url || m.cover || null,
        max_participants: m.max_participants || m.max_ppl || null,
        participant_count: countsByMeetupId[m.id] || 0
      }))

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, meetups: normalized })
      }
    } catch (aggError) {
      console.error('Aggregate meetups error:', aggError)
      // 发生聚合错误时，仍然返回原始数据，避免接口不可用
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, meetups: data })
      }
    }

  } catch (error) {
    console.error('Get meetups error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '获取活动失败',
        details: error.message
      })
    }
  }
}

// 更新活动
async function updateMeetup(event, headers) {
  try {
    const params = event.queryStringParameters || {}
    const { id } = params
    const updateData = JSON.parse(event.body)

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '缺少活动ID'
        })
      }
    }

    // 检查活动是否存在
    const { data: existingMeetup, error: fetchError } = await supabase
      .from('meetups')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingMeetup) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '活动不存在'
        })
      }
    }

    // 验证权限（只有创建者可以修改）
    if (updateData.createdBy && existingMeetup.created_by && 
        updateData.createdBy !== existingMeetup.created_by) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: '没有权限修改此活动'
        })
      }
    }

    // 准备更新数据
    const allowedFields = [
      'title', 'description', 'type', 'category', 'datetime', 
      'location', 'max_participants', 'fee', 'organizer', 'contact', 
      'qr_image_url', 'notes', 'status'
    ]
    
    const updateRecord = {}
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateRecord[field] = updateData[field]
      }
    })

    // 更新数据库
    const { data, error } = await supabase
      .from('meetups')
      .update(updateRecord)
      .eq('id', id)
      .select()

    if (error) {
      console.error('Database update error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '更新活动失败',
          details: error.message
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '活动更新成功',
        meetup: data[0]
      })
    }

  } catch (error) {
    console.error('Update meetup error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '更新活动失败',
        details: error.message
      })
    }
  }
}

// 删除活动
async function deleteMeetup(event, headers) {
  try {
    const params = event.queryStringParameters || {}
    const { id, createdBy } = params

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '缺少活动ID'
        })
      }
    }

    // 检查活动是否存在
    const { data: existingMeetup, error: fetchError } = await supabase
      .from('meetups')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingMeetup) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '活动不存在'
        })
      }
    }

    // 验证权限（只有创建者可以删除）
    if (createdBy && existingMeetup.created_by && 
        createdBy !== existingMeetup.created_by) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: '没有权限删除此活动'
        })
      }
    }

    // 软删除（更新状态为cancelled）
    const { error } = await supabase
      .from('meetups')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (error) {
      console.error('Database delete error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '删除活动失败',
          details: error.message
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '活动删除成功'
      })
    }

  } catch (error) {
    console.error('Delete meetup error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '删除活动失败',
        details: error.message
      })
    }
  }
}