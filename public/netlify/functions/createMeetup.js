// netlify/functions/createMeetup.js
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { title, datetime, location, description, wechat } = data;

    if (!title || !datetime || !location || !description || !wechat) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    const manage_token = uuidv4();

    const record = {
      title,
      datetime,
      location,
      description,
      wechat_id: wechat,
      manage_token,
      created_at: new Date().toISOString()
    };

    const { data: inserted, error } = await supabase
      .from('meetups')
      .insert([record])
      .select('id, manage_token');

    if (error) {
      console.error('Error inserting meetup:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to save meetup", details: error.message })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Meetup created successfully',
        id: inserted[0].id,
        manage_token: inserted[0].manage_token
      })
    };
  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: err.message
      })
    };
  }
}
