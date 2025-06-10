import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function handler(event, context) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const token = event.queryStringParameters.token;
  const meetup_id = event.queryStringParameters.meetup_id;

  try {
    let meetup = null;
    let rsvpFields = 'name, status';
    let resolvedMeetupId = meetup_id;

    // If token is present, lookup by manage_token
    if (token) {
      const { data, error } = await supabase
        .from('meetups')
        .select('id, title, datetime, location, description, wechat_id')
        .eq('manage_token', token)
        .maybeSingle();

      if (error || !data) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Meetup not found by token' }),
        };
      }

      meetup = data;
      resolvedMeetupId = data.id;
      rsvpFields = 'name, wechat_id, status';
    }

    // If only meetup_id is provided (public access)
    if (!meetup && resolvedMeetupId) {
      const { data, error } = await supabase
        .from('meetups')
        .select('id, title, datetime, location, description')
        .eq('id', resolvedMeetupId)
        .maybeSingle();

      if (error || !data) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Meetup not found by ID' }),
        };
      }

      meetup = data;
    }

    // Fetch RSVPs
    const { data: rsvps, error: rsvpError } = await supabase
      .from('meetup_rsvps')
      .select(rsvpFields)
      .eq('meetup_id', resolvedMeetupId)
      .order('created_at', { ascending: true });

    if (rsvpError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch RSVPs' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ meetup, rsvps }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Unexpected error', message: err.message }),
    };
  }
}
