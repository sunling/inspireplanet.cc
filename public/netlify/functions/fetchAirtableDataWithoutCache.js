// netlify/functions/fetchAirtableDataWithoutCache.js
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  try {
    // Check HTTP method
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    // Determine which fields to fetch
    let selectedFields = ['Title', 'Quote', 'ImagePath', 'Upload', 'Detail', 'Creator', 'Created', 'Theme', 'Font'];

    // If POST request with specific fields requested
    if (event.httpMethod === 'POST' && event.body) {
      try {
        const requestBody = JSON.parse(event.body);
        if (requestBody.fields && Array.isArray(requestBody.fields)) {
          selectedFields = requestBody.fields;
        }
      } catch (e) {
        console.error('Error parsing request body:', e);
      }
    }

    // Construct fields query and sorting parameters
    let queryParams = [];

    // Add fields
    if (selectedFields.length > 0) {
      queryParams = queryParams.concat(selectedFields.map(f => `fields[]=${encodeURIComponent(f)}`));
    }

    // Add sorting by Created field in descending order
    queryParams.push('sort[0][field]=Created');
    queryParams.push('sort[0][direction]=desc');

    // Limit to 100 records
    queryParams.push('maxRecords=100');

    // Join all query parameters
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    // Fetch data from Airtable
    const AIRTABLE_BASE_NAME = process.env.AIRTABLE_BASE_NAME;
    const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_NAME}/${AIRTABLE_TABLE_NAME}${queryString}`;

    const response = await fetch(url, {
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

    // Process the data to make it more frontend-friendly
    const processedData = {
      records: data.records.map(record => ({
        id: record.id,
        ...record.fields
      }))
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(processedData)
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message })
    };
  }
};

// ADD this function to allow clearing cache
exports.clearAirtableCache = function () {
  airtableCache = null;
  cacheTimestamp = null;
}
