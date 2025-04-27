// netlify/functions/clearCache.js
import { clearAirtableCache } from './fetchAirtableData.js';

export async function handler(event, context) {
  try {
    clearAirtableCache();  // Call the clear function
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Cache cleared successfully' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Failed to clear cache', error: error.message })
    };
  }
}
