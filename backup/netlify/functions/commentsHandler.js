// netlify/functions/commentsHandler.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export async function handler(event, context) {
  try {
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
      
      // Query comments from Supabase
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('CardId', cardId)
        .order('Created', { ascending: false });
      
      if (error) {
        console.error('Error fetching comments:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Database query error', 
            details: error.message 
          })
        };
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          comments: data.map(row => ({
            id: row.id,
            name: row.Name || '',
            comment: row.Comment || '',
            created: row.Created
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
      
      // Prepare the comment record for Supabase
      const record = {
        CardId: commentData.cardId,
        Name: sanitizedName,
        Comment: sanitizedComment,
        Created: new Date().toISOString()
      };
      
      // Insert into Supabase
      const { data, error } = await supabase
        .from('comments')
        .insert([record])
        .select();
      
      if (error) {
        console.error('Error inserting comment:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            error: 'Failed to submit comment',
            details: error.message
          })
        };
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Comment submitted successfully',
          id: data[0].id
        })
      };
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
}

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
