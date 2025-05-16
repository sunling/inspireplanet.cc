// netlify/functions/fetchCardsFromSupabase.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export async function handler(event, context) {
  const { data, error } = await supabase
    .from('weekly_cards')
    .select('*')
    .order('Created', { ascending: false })

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    }
  }

  const records = data.map((row, index) => ({
    id: row.id || `row_${index}`,
    Episode: row.Episode,
    Title: row.Title,
    Name: row.Name,
    Quote: row.Quote,
    Detail: row.Detail,
    Created: row.Created,
  }));

  return {
    statusCode: 200,
    body: JSON.stringify({ records }),
  }
}
