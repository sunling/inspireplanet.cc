// netlify/functions/uploadCardToAirtable.js
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
    const cardData = JSON.parse(event.body);
    
    // Validate required fields
    if (!cardData.title || !cardData.quote || !cardData.detail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Generate a hash for the card (to prevent duplicates)
    const hash = generateHash(cardData);
    
    // Check if the card already exists
    const AIRTABLE_BASE_NAME = process.env.AIRTABLE_BASE_NAME;
    const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    
    const formula = `{Hash} = "${hash}"`;
    const checkIfExistUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_NAME}/${AIRTABLE_TABLE_NAME}?filterByFormula=${encodeURIComponent(formula)}`;
    
    const existsRes = await fetch(checkIfExistUrl, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`
      }
    });

    const exists = await existsRes.json();
    if (exists.records && exists.records.length > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({ 
          message: "This card already exists", 
          success: false 
        })
      };
    }

    // Prepare the record for Airtable
    const record = {
      fields: {
        Theme: JSON.stringify(cardData.theme),
        Font: cardData.font,
        Title: cardData.title,
        Quote: cardData.quote,
        ImagePath: cardData.imagePath,
        Detail: cardData.detail,
        Upload: cardData.upload || '',
        Creator: cardData.creator,
        Hash: hash,
      }
    };

    // Submit to Airtable
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_NAME}/${AIRTABLE_TABLE_NAME}`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(record)
    });

    const data = await res.json();
    
    if (res.ok) {
      // Clear the cache by making a request to fetchAirtableData with cache invalidation flag
      try {
        const clearCacheUrl = `/.netlify/functions/fetchAirtableData`;
        await fetch(clearCacheUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ invalidateCache: true })
        });
        console.log('Cache invalidation request sent');
      } catch (cacheError) {
        console.error('Failed to invalidate cache:', cacheError);
        // Continue even if cache invalidation fails
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: "Card submitted successfully", 
          success: true,
          id: data.id
        })
      };
    } else {
      return {
        statusCode: res.status,
        body: JSON.stringify({ 
          error: "Failed to submit card", 
          details: data,
          success: false
        })
      };
    }
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
};

// Helper function to generate a hash for the card
function generateHash(card) {
  if (!card.title || !card.quote || !card.detail) return null;

  const normalized = [
    card.title.trim().replace(/\s+/g, ' '),
    card.quote.trim().replace(/\s+/g, ' '),
    card.detail.trim().replace(/\s+/g, ' ')
  ].join('|');

  // Simple base64 encoding for the hash
  return Buffer.from(normalized).toString('base64');
}
