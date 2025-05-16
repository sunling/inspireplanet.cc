// netlify/functions/uploadWeeklyCard.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export async function handler(event, context) {
  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    // Parse the request body
    const requestData = JSON.parse(event.body);
    const record = requestData.record;
    
    // Validate required fields
    if (!record.episode || !record.name || !record.title || !record.quote || !record.detail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          error: 'Missing required fields',
          missingFields: getMissingFields(record)
        })
      };
    }

    // Prepare the record for Supabase
    const weeklyCardRecord = {
      Episode: record.episode,
      Name: record.name,
      Title: record.title,
      Quote: record.quote,
      Detail: record.detail,
      Created: new Date().toISOString()
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('weekly_cards')
      .insert([weeklyCardRecord])
      .select();
    
    if (error) {
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false,
          error: "Failed to submit weekly card", 
          details: error.message
        })
      };
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: "Weekly card submitted successfully", 
        id: data[0].id
      })
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        error: 'Internal Server Error', 
        message: error.message
      })
    };
  }
}

// Helper function to identify missing fields
function getMissingFields(record) {
  const requiredFields = ['episode', 'name', 'title', 'quote', 'detail'];
  return requiredFields.filter(field => !record[field]);
}
