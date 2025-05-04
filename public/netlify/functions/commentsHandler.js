// netlify/functions/commentsHandler.js
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  try {
    // Get Airtable credentials from environment variables
    const AIRTABLE_BASE_NAME = process.env.AIRTABLE_BASE_NAME;
    const AIRTABLE_TABLE_NAME_COMMENTS = process.env.AIRTABLE_TABLE_NAME_COMMENTS || 'Comments';
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    
    // Handle GET requests - fetch comments for a specific card
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters;
      const cardId = params && params.cardId;
      
      if (!cardId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing cardId parameter' })
        };
      }
      
      // Construct the Airtable API URL with filter for the specific card ID
      const formula = `{CardId} = "${cardId}"`;
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_NAME}/${AIRTABLE_TABLE_NAME_COMMENTS}?filterByFormula=${encodeURIComponent(formula)}&sort[0][field]=Created&sort[0][direction]=desc`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          comments: data.records.map(record => ({
            id: record.id,
            name: record.fields.Name || '',
            comment: record.fields.Comment || '',
            created: record.fields.Created || new Date().toISOString()
          }))
        })
      };
    }
    
    // Handle POST requests - submit a new comment
    if (event.httpMethod === 'POST') {
      if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing request body' })
        };
      }
      
      const commentData = JSON.parse(event.body);
      
      // Validate required fields
      if (!commentData.cardId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing cardId field' })
        };
      }
      
      // Sanitize and validate name and comment
      const sanitizedName = sanitizeInput(commentData.name || '', 100);
      const sanitizedComment = sanitizeInput(commentData.comment || '', 500);
      
      // Reject if name or comment is empty after sanitization
      if (!sanitizedName) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Name cannot be empty' })
        };
      }
      
      if (!sanitizedComment) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Comment cannot be empty' })
        };
      }
      
      // Prepare the record for Airtable
      const record = {
        fields: {
          CardId: commentData.cardId,
          Name: sanitizedName,
          Comment: sanitizedComment
        }
      };
      
      // Submit to Airtable
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_NAME}/${AIRTABLE_TABLE_NAME_COMMENTS}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            message: 'Comment submitted successfully',
            id: data.id
          })
        };
      } else {
        return {
          statusCode: response.status,
          body: JSON.stringify({
            success: false,
            error: 'Failed to submit comment',
            details: data
          })
        };
      }
    }
    
    // Handle unsupported HTTP methods
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
    
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      })
    };
  }
};

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - The input string to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} - Sanitized string
 */
function sanitizeInput(input, maxLength) {
  if (!input) return '';
  
  // Trim leading/trailing spaces
  let sanitized = input.trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Escape HTML special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  return sanitized;
}
