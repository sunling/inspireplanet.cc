// netlify/functions/cardsHandler.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// In-memory cache
let cache = {
  allCards: null,
  cardsByIds: {}
};

export async function handler(event, context) {
  if (event.httpMethod === 'POST') {
    cache.allCards = null;
    cache.cardsByIds = {};
    console.log("Saving card");
    return await save(event, context);
  } else if (event.httpMethod === 'GET') {
    console.log("Fetching cards");
    return await fetch(event, context);
  } else {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }
}

function safeParseTheme(value) {
  try {
    const first = typeof value === "string" ? JSON.parse(value) : value;
    return typeof first === "string" ? JSON.parse(first) : first;
  } catch (e) {
    console.error("Failed to parse theme", e);
    return {};
  }
}

async function save(event, context) {
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
    const { data: existingCards, error: checkError } = await supabase
      .from('cards')
      .select('id')
      .eq('Hash', hash)
      .limit(1);

    if (checkError) {
      console.error('Error checking for existing card:', checkError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Database query error',
          details: checkError.message,
          success: false
        })
      };
    }

    if (existingCards && existingCards.length > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          message: "This card already exists",
          success: false
        })
      };
    }

    // Prepare the record for Supabase
    const record = {
      Theme: JSON.stringify(cardData.theme),
      Font: cardData.font,
      Title: cardData.title,
      Quote: cardData.quote,
      ImagePath: cardData.imagePath,
      Detail: cardData.detail,
      Upload: cardData.upload || '',
      Creator: cardData.creator,
      Hash: hash,
      Created: new Date().toISOString()
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('cards')
      .insert([record])
      .select();

    if (error) {
      console.error('Error inserting card:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Failed to submit card",
          details: error.message,
          success: false
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Card submitted successfully",
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

async function fetch(event, context) {

  // Check if we have an id parameter in the query string
  const params = event.queryStringParameters || {};
  const idParam = params.id;

  if (idParam) {
    // Check if it's a comma-separated list of IDs
    if (idParam.includes(',')) {
      const ids = idParam.split(',').map(id => id.trim()).filter(id => id);
      const cacheKey = ids.sort().join(',');

      if (cache.cardsByIds[cacheKey]) {
        return {
          statusCode: 200,
          body: JSON.stringify({ records: cache.cardsByIds[cacheKey] }),
        };
      }
    } else {
      // Single ID
      if (cache.cardsByIds[idParam]) {
        console.log("Cache hit for ID:", idParam);
        return {
          statusCode: 200,
          body: JSON.stringify({ records: cache.cardsByIds[idParam] }),
        };
      }
    }
  } else if (cache.allCards) {
    // Return all cards from cache
    console.log("Cache hit for all cards");
    return {
      statusCode: 200,
      body: JSON.stringify({ records: cache.allCards }),
    };
  }

  // Start building the query
  let query = supabase.from('cards').select('*');

  // If id parameter exists, filter by iyt
  // If id parameter exists, filter by it
  if (idParam) {
    // Check if it's a comma-separated list of IDs
    if (idParam.includes(',')) {
      const ids = idParam.split(',').map(id => id.trim()).filter(id => id);
      query = query.in('id', ids);
    } else {
      // Single ID
      query = query.eq('id', idParam);
    }
  }

  // Apply ordering
  query = query.order('Created', { ascending: false });

  // Execute the query
  const { data, error } = await query;

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    }
  }
  const records = data.map((row, index) => ({
    id: row.id || `row_${index}`,
    Title: row.Title,
    Quote: row.Quote,
    Detail: row.Detail,
    Theme: safeParseTheme(row.Theme),
    Font: row.Font,
    ImagePath: row.ImagePath,
    Upload: row.Upload,
    Creator: row.Creator,
    Created: row.Created,
    Hash: row.Hash,
  }));

  // Update cache
  if (idParam) {
    if (idParam.includes(',')) {
      const ids = idParam.split(',').map(id => id.trim()).filter(id => id);
      const cacheKey = ids.sort().join(',');
      cache.cardsByIds[cacheKey] = records;
    } else {
      cache.cardsByIds[idParam] = records;
    }
  } else {
    cache.allCards = records;
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ records }),
  }
}
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