// netlify/functions/workshopHandler.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export async function handler(event, context) {
  // Only allow POST requests for registrations
  if (event.httpMethod === 'POST') {
    return await saveRegistration(event, context);
  } else {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }
}

async function saveRegistration(event, context) {
  try {
    // Parse the request body
    const registrationData = JSON.parse(event.body);

    // Validate required fields
    if (!registrationData.name || !registrationData.wechat) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields', success: false })
      };
    }

    // Prepare the record for Supabase
    const record = {
      name: registrationData.name,
      wechat: registrationData.wechat,
      why: registrationData.why || '',
      expectation: registrationData.expectation || '',
      paid: registrationData.paid === 'true', // Convert string to boolean
      created_at: new Date().toISOString()
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('workshop')
      .insert([record])
      .select();

    if (error) {
      console.error('Error inserting registration:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Failed to submit registration",
          details: error.message,
          success: false
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Registration submitted successfully",
        success: true,
        id: data[0].id
      })
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        success: false
      })
    };
  }
}
