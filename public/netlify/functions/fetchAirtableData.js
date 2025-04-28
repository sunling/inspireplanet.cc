// netlify/functions/fetchAirtableData.js
const fetch = require('node-fetch');

// Cache implementation
let cachedData = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

exports.handler = async (event, context) => {
  try {
    // Check HTTP method
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    // Check for cache invalidation request
    if (event.httpMethod === 'POST' && event.body) {
      try {
        const requestBody = JSON.parse(event.body);
        if (requestBody.invalidateCache) {
          console.log('Cache invalidation requested, clearing cache');
          cachedData = null;
          cacheTimestamp = 0;

          // Return success response for cache invalidation request
          return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Cache invalidated successfully' })
          };
        }
      } catch (e) {
        console.error('Error parsing request body:', e);
      }
    }

    // Check if we have valid cached data
    const now = Date.now();
    if (cachedData && (now - cacheTimestamp < CACHE_DURATION)) {
      console.log('Returning cached data');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=300' // 5 minutes browser caching
        },
        body: JSON.stringify(cachedData)
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

    // Determine which table to use
    let tableType = 'regular';
    if (event.httpMethod === 'POST' && event.body) {
      try {
        const requestBody = JSON.parse(event.body);
        if (requestBody.tableType === 'weekly') {
          tableType = 'weekly';
          selectedFields = ['Episode', 'Name', 'Title', 'Quote', 'Detail', 'Created'];
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

    // Add sorting parameters based on table type
    if (tableType === 'weekly') {
      // For weekly table, sort by Episode in descending order, then by Created in ascending order
      queryParams.push('sort[0][field]=Episode');
      queryParams.push('sort[0][direction]=desc');
      queryParams.push('sort[1][field]=Created');
      queryParams.push('sort[1][direction]=asc');
    } else {
      // For regular table, sort by Created in descending order
      queryParams.push('sort[0][field]=Created');
      queryParams.push('sort[0][direction]=desc');
    }

    // Limit to records (more for weekly table)
    queryParams.push(`maxRecords=${tableType === 'weekly' ? 200 : 100}`);

    // Join all query parameters
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    // Fetch data from Airtable
    const AIRTABLE_BASE_NAME = process.env.AIRTABLE_BASE_NAME;
    const AIRTABLE_TABLE_NAME = tableType === 'weekly' ? 
      process.env.AIRTABLE_TABLE_NAME_WEEKLY : 
      process.env.AIRTABLE_TABLE_NAME;
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_NAME}/${AIRTABLE_TABLE_NAME}${queryString}`;

    console.log("ulr", url);
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

    // Update cache
    cachedData = processedData;
    cacheTimestamp = now;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=300' // 5 minutes browser caching
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
