// netlify/functions/getLatestWeeklyCards.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export async function handler(event, context) {
  try {
    // 获取最新一期的episode编号
    const { data: latestEpisode, error: episodeError } = await supabase
      .from('weekly_cards')
      .select('Episode')
      .order('Episode', { ascending: false })
      .limit(1)

    if (episodeError) {
      console.error('Error fetching latest episode:', episodeError)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: episodeError.message }),
      }
    }

    if (!latestEpisode || latestEpisode.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ records: [] }),
      }
    }

    const latestEpisodeNumber = latestEpisode[0].Episode

    // 获取该期的所有卡片
    const { data, error } = await supabase
      .from('weekly_cards')
      .select('*')
      .eq('Episode', latestEpisodeNumber)
      .order('Created', { ascending: false })

    if (error) {
      console.error('Error fetching weekly cards:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      }
    }

    // 格式化返回数据，保持与fetchWeeklyCards一致的结构
    const records = data.map((row, index) => ({
      id: row.id || `row_${index}`,
      Episode: row.Episode,
      Title: row.Title,
      Name: row.Name,
      Quote: row.Quote,
      Detail: row.Detail,
      Created: row.Created,
      ImagePath: row.ImagePath
    }))

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        records,
        episode: latestEpisodeNumber,
        total: records.length
      }),
    }
  } catch (error) {
    console.error('Function error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message
      }),
    }
  }
}