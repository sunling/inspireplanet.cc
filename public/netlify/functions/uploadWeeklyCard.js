// netlify/functions/uploadWeeklyCard.js
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
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

    // Get Airtable configuration from environment variables
    const AIRTABLE_BASE_NAME = process.env.AIRTABLE_BASE_NAME;
    const AIRTABLE_TABLE_NAME_WEEKLY = process.env.AIRTABLE_TABLE_NAME_WEEKLY;
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    
    if (!AIRTABLE_BASE_NAME || !AIRTABLE_TABLE_NAME_WEEKLY || !AIRTABLE_TOKEN) {
      console.error('Missing Airtable environment variables');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          error: 'Server configuration error' 
        })
      };
    }

    // Prepare the record for Airtable
    const airtableRecord = {
      records: [
        {
          fields: {
            Episode: record.episode,
            Name: record.name,
            Title: record.title,
            Quote: record.quote,
            Detail: record.detail
          }
        }
      ]
    };

    // Submit to Airtable
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_NAME}/${AIRTABLE_TABLE_NAME_WEEKLY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(airtableRecord)
    });

    const data = await response.json();
    
    if (response.ok) {
      // Clear the cache by making a request to fetchAirtableData with cache invalidation flag
      try {
        const clearCacheUrl = `/.netlify/functions/fetchAirtableData`;
        await fetch(clearCacheUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            invalidateCache: true,
            tableType: 'weekly'
          })
        });
        console.log('Weekly cards cache invalidation request sent');
      } catch (cacheError) {
        console.error('Failed to invalidate cache:', cacheError);
        // Continue even if cache invalidation fails
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true,
          message: "Weekly card submitted successfully", 
          id: data.records[0].id
        })
      };
    } else {
      console.error('Airtable API error:', data);
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          success: false,
          error: "Failed to submit weekly card", 
          details: data.error ? data.error.message : 'Unknown error'
        })
      };
    }
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
};

// Helper function to identify missing fields
function getMissingFields(record) {
  const requiredFields = ['episode', 'name', 'title', 'quote', 'detail'];
  return requiredFields.filter(field => !record[field]);
}
