// netlify/functions/uploadWeeklyCard.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fetch from 'node-fetch'
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

    // Call searchImage function to get images based on the detail content
    const searchResponse = await fetch(`${getBaseUrl()}/.netlify/functions/searchImage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: record.detail })
    });
    
    let imagePath = null;
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      
      if (searchData.images && searchData.images.length > 0) {
        // Randomly select one of the returned images
        const randomIndex = Math.floor(Math.random() * searchData.images.length);
        imagePath = searchData.images[randomIndex].url;
      }
    } else {
      console.warn('Failed to fetch image, continuing without image');
    }

    // Prepare the record for Supabase
    const weeklyCardRecord = {
      Episode: record.episode,
      Name: record.name,
      Title: record.title,
      Quote: record.quote,
      Detail: record.detail,
      ImagePath: imagePath, // Add the selected image URL
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

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  } else if (process && process.env && process.env.URL) {
    return process.env.URL;
  } else {
    return 'http://localhost:8888'; // fallback for local dev
  }
} 
