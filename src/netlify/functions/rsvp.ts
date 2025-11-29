import { supabase } from '../../database/supabase';
import dotenv from 'dotenv';
import { getCommonHttpHeader } from '../../utils/http';
dotenv.config();

export async function handler(event: any, context: any) {
  // CORS headers
  const headers = getCommonHttpHeader();

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    switch (event.httpMethod) {
      case 'POST':
        return await createRSVP(event, headers);
      case 'GET':
        return await getRSVPs(event, headers);
      case 'PUT':
        return await updateRSVP(event, headers);
      case 'DELETE':
        return await deleteRSVP(event, headers);
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({
            success: false,
            error: '不支持的HTTP方法',
          }),
        };
    }
  } catch (error) {
    console.error('RSVP Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}

// 创建RSVP
async function createRSVP(event: any, headers: any) {
  try {
    const rsvpData = JSON.parse(event.body);
    const meetupIdNum = Number(rsvpData.meetup_id);
    const wechatId = String(rsvpData.wechat_id || '').trim();
    const name = String(rsvpData.name || '').trim();

    // 验证必填字段
    const requiredFields = ['meetup_id', 'name', 'wechat_id'];
    for (const field of requiredFields) {
      if (!rsvpData[field]) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: `缺少必填字段: ${field}`,
          }),
        };
      }
    }

    if (!Number.isFinite(meetupIdNum) || meetupIdNum <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '活动ID不合法' }),
      };
    }

    if (!wechatId || !name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '姓名或微信号不合法' }),
      };
    }

    // 检查活动是否存在
    const { data: meetup, error: meetupError } = await supabase
      .from('meetups')
      .select('id, max_ppl, status')
      .eq('id', meetupIdNum)
      .single();

    if (meetupError || !meetup) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '活动不存在',
        }),
      };
    }

    if (meetup.status === 'cancelled') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '活动已取消',
        }),
      };
    }

    // 检查是否已经报名
    const { data: existingRSVP, error: checkError } = await supabase
      .from('meetup_rsvps')
      .select('id, status')
      .eq('meetup_id', meetupIdNum)
      .eq('wechat_id', wechatId)
      .single();

    if (existingRSVP && existingRSVP.status === 'confirmed') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '您已经报名了这个活动',
        }),
      };
    }

    // 检查人数限制
    const maxLimit = Number(meetup.max_ppl);
    const enforceLimit = Number.isFinite(maxLimit) && maxLimit > 0;
    if (enforceLimit) {
      const { count, error: countError } = await supabase
        .from('meetup_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('meetup_id', meetupIdNum)
        .eq('status', 'confirmed');

      if (countError) {
        console.error('Count error:', countError);
      } else if (count !== null && count >= maxLimit) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: '活动人数已满',
          }),
        };
      }
    }

    // 创建或更新RSVP
    let result;
    if (existingRSVP) {
      // 更新现有RSVP
      const { data, error } = await supabase
        .from('meetup_rsvps')
        .update({
          name,
          status: 'confirmed',
          username: (rsvpData.username || null) as any,
        })
        .eq('id', existingRSVP.id)
        .select();

      result = { data, error };
    } else {
      // 创建新RSVP
      const { data, error } = await supabase
        .from('meetup_rsvps')
        .insert([
          {
            meetup_id: meetupIdNum,
            name,
            wechat_id: wechatId,
            username: (rsvpData.username || null) as any,
            status: 'confirmed',
          },
        ])
        .select();

      result = { data, error };
    }

    if (result.error) {
      console.error('Database error:', result.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '报名失败',
          details: result.error.message,
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '报名成功',
        rsvp: result.data?.[0] || null,
      }),
    };
  } catch (error) {
    console.error('Create RSVP error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '报名失败',
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}

// 获取RSVP列表
async function getRSVPs(event: any, headers: any) {
  try {
    const params = event.queryStringParameters || {};
    const { meetup_id, user_id, wechat_id } = params;
    const meetupIdNum = meetup_id !== undefined ? Number(meetup_id) : undefined;

    let query = supabase.from('meetup_rsvps').select('*');

    if (meetupIdNum !== undefined && Number.isFinite(meetupIdNum)) {
      query = query.eq('meetup_id', meetupIdNum);
    }

    if (user_id) {
      query = query.eq('username', user_id);
    }

    if (wechat_id) {
      query = query.eq('wechat_id', wechat_id);
    }

    // 只返回确认的RSVP
    query = query.eq('status', 'confirmed');
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '获取报名信息失败',
          details: error.message,
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        rsvps: data || [],
      }),
    };
  } catch (error) {
    console.error('Get RSVPs error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '获取报名信息失败',
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}

// 更新RSVP状态
async function updateRSVP(event: any, headers: any) {
  try {
    const params = event.queryStringParameters || {};
    const { id } = params;
    const updateData = JSON.parse(event.body);

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '缺少RSVP ID',
        }),
      };
    }

    // 检查RSVP是否存在
    const { data: existingRSVP, error: fetchError } = await supabase
      .from('meetup_rsvps')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingRSVP) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'RSVP不存在',
        }),
      };
    }

    // 准备更新数据
    const allowedFields = ['status', 'name'];
    const updateRecord = {};
    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        (updateRecord as Record<string, any>)[field] = (
          updateData as Record<string, any>
        )[field];
      }
    });

    // 更新数据库
    const { data, error } = await supabase
      .from('meetup_rsvps')
      .update(updateRecord)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Database update error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '更新RSVP失败',
          details: error.message,
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'RSVP更新成功',
        rsvp: data[0],
      }),
    };
  } catch (error) {
    console.error('Update RSVP error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '更新RSVP失败',
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}

// 取消RSVP
async function deleteRSVP(event: any, headers: any) {
  try {
    const params = event.queryStringParameters || {};
    const { id, meetup_id, wechat_id } = params;
    const idNum = id !== undefined ? Number(id) : undefined;
    const meetupIdNum = meetup_id !== undefined ? Number(meetup_id) : undefined;

    let query = supabase.from('meetup_rsvps').select('*');

    if (idNum !== undefined && Number.isFinite(idNum)) {
      query = query.eq('id', idNum);
    } else if (meetupIdNum !== undefined && Number.isFinite(meetupIdNum) && wechat_id) {
      query = query.eq('meetup_id', meetupIdNum).eq('wechat_id', wechat_id);
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '缺少必要参数',
        }),
      };
    }

    // 软删除（更新状态为cancelled）
    // 重新构建查询条件而不是使用getFilter()
    let deleteQuery = supabase
      .from('meetup_rsvps')
      .update({ status: 'cancelled' });

    if (idNum !== undefined && Number.isFinite(idNum)) {
      deleteQuery = deleteQuery.eq('id', idNum);
    } else if (meetupIdNum !== undefined && Number.isFinite(meetupIdNum) && wechat_id) {
      deleteQuery = deleteQuery
        .eq('meetup_id', meetupIdNum)
        .eq('wechat_id', wechat_id);
    }

    const { data, error } = await deleteQuery.select();

    if (error) {
      console.error('Database delete error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: '取消报名失败',
          details: error.message,
        }),
      };
    }

    if (!data || data.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'RSVP不存在',
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '取消报名成功',
      }),
    };
  } catch (error) {
    console.error('Delete RSVP error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '取消报名失败',
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}
