// netlify/functions/commentsHandler.ts
import { supabase } from '../../database/supabase';
import dotenv from 'dotenv';
import { NetlifyContext, NetlifyEvent } from '../types/http';
import { sanitizeInput } from '../../utils/helper';
dotenv.config();

// 定义数据接口
export interface Comment {
  id: string;
  cardId: string;
  name: string;
  comment: string;
  created: string;
}

export interface CommentResponse {
  id: string;
  name: string;
  comment: string;
  created: string;
}

export interface CommentRequest {
  cardId: string;
  name?: string;
  comment?: string;
}

export interface CommentsResponse {
  success: boolean;
  comments?: CommentResponse[];
  message?: string;
  id?: string;
  error?: string;
  details?: string;
}

export async function handler(
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<{ statusCode: number; body: string }> {
  try {
    // Handle GET requests - fetch comments for a specific card
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters;
      const cardId = params && params.cardId;

      if (!cardId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing cardId parameter' }),
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
            details: error.message,
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          comments: data.map((row) => ({
            id: row.id,
            name: row.Name || '',
            comment: row.Comment || '',
            created: row.Created,
          })),
        }),
      };
    }

    // Handle POST requests - submit a new comment
    if (event.httpMethod === 'POST') {
      if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing request body' }),
        };
      }

      const commentData = JSON.parse(event.body);

      // Validate required fields
      if (!commentData.cardId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing cardId field' }),
        };
      }

      // Sanitize and validate name and comment
      const sanitizedName = sanitizeInput(commentData.name || '', 100);
      const sanitizedComment = sanitizeInput(commentData.comment || '', 500);

      // Reject if name or comment is empty after sanitization
      if (!sanitizedName) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Name cannot be empty' }),
        };
      }

      if (!sanitizedComment) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Comment cannot be empty' }),
        };
      }

      // Prepare the comment record for Supabase
      const record = {
        CardId: commentData.cardId,
        Name: sanitizedName,
        Comment: sanitizedComment,
        Created: new Date().toISOString(),
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
            details: error.message,
          }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Comment submitted successfully',
          id: data[0].id,
        }),
      };
    }

    // Handle unsupported HTTP methods
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}
