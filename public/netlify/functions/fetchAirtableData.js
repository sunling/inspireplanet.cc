// netlify/functions/fetchAirtableData.js
// Cache implementation
let cachedData = {
  cards: null,
  weekly: null
};

const DEFAULT_TABLE_TYPE = 'cards';  // 默认是 cards

exports.handler = async (event, context) => {
  try {
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    let tableType = DEFAULT_TABLE_TYPE;
    if (event.httpMethod === 'POST' && event.body) {
      try {
        console.log('Parsing request body for cache invalidation');
        const requestBody = JSON.parse(event.body);
        if (requestBody.invalidateCache) {
          console.log('Cache invalidation requested');
          if (requestBody.tableType === 'weekly') {
            console.log('Clearing weekly cards cache only');
            cachedData.weekly = null;
          } else if (requestBody.tableType === 'cards') {
            console.log('Clearing submitted cards cache only');
            cachedData.cards = null;
          } else {
            console.log('Clearing all caches');
            cachedData = { cards: null, weekly: null };
          }

          return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Cache invalidated successfully' })
          };
        }
        if (requestBody.tableType === 'weekly') {
          tableType = 'weekly';
        }
      } catch (e) {
        console.error('Error parsing request body:', e);
      }
    }
    console.log(`Fetching data for tableType=${tableType}, cacheExists=${!!cachedData[tableType]}`);
    // If we have cached data and it's fresh, return it
    if (cachedData[tableType]) {
      console.log(`Returning fresh cached data for tableType=${tableType}`);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=300'
        },
        body: JSON.stringify(cachedData[tableType])
      };
    }

    // If no cache or very old, fetch fresh now
    console.log(`No valid cache, fetching fresh data for tableType=${tableType}`);
    const freshData = await fetchFromAirtable(tableType);
    cachedData[tableType] = freshData;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=300'
      },
      body: JSON.stringify(freshData)
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message })
    };
  }
};

// Helper to fetch fresh data
async function fetchFromAirtable(tableType) {
  let selectedFields = ['Title', 'Quote', 'ImagePath', 'Upload', 'Detail', 'Creator', 'Created', 'Theme', 'Font'];
  if (tableType === 'weekly') {
    selectedFields = ['Episode', 'Name', 'Title', 'Quote', 'Detail', 'Created'];
  }

  const AIRTABLE_BASE_NAME = process.env.AIRTABLE_BASE_NAME;
  const AIRTABLE_TABLE_NAME = tableType === 'weekly' ?
    process.env.AIRTABLE_TABLE_NAME_WEEKLY :
    process.env.AIRTABLE_TABLE_NAME;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

  let queryParams = selectedFields.map(f => `fields[]=${encodeURIComponent(f)}`);
  if (tableType === 'weekly') {
    queryParams.push('sort[0][field]=Episode');
    queryParams.push('sort[0][direction]=desc');
    queryParams.push('sort[1][field]=Created');
    queryParams.push('sort[1][direction]=asc');
  } else {
    queryParams.push('sort[0][field]=Created');
    queryParams.push('sort[0][direction]=desc');
  }
  queryParams.push(`maxRecords=${tableType === 'weekly' ? 200 : 100}`);

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_NAME}/${AIRTABLE_TABLE_NAME}?${queryParams.join('&')}`;

  const response = await require('node-fetch')(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Airtable API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    records: data.records.map(record => ({
      id: record.id,
      ...record.fields
    }))
  };
}