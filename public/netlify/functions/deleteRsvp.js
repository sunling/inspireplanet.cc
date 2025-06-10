// netlify/functions/deleteRsvp.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { meetup_id, name, wechat_id } = JSON.parse(event.body);

    if (!meetup_id || !name || !wechat_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const { error } = await supabase
      .from('meetup_rsvps')
      .delete()
      .match({ meetup_id, name, wechat_id });

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to delete RSVP', details: error.message }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error', message: err.message }),
    };
  }
}
