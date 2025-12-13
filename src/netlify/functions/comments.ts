// netlify/functions/commentsHandler.ts
import { supabase } from '../../database/supabase';
import dotenv from 'dotenv';
import { NetlifyContext, NetlifyEvent } from '../types/http';
import { sanitizeInput } from '../../utils/helper';
import jwt from 'jsonwebtoken';
import { createNotification } from './notifications';
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

const JWT_SECRET = process.env.JWT_SECRET as string;

function getUserId(event: any) {
  const auth = event.headers?.authorization || event.headers?.Authorization;
  if (!auth || !String(auth).startsWith('Bearer ')) return null;
  const token = String(auth).substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.userId || decoded.user_id || null;
  } catch {
    return null;
  }
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

      // Require auth and sanitize comment
      const uid = getUserId(event);
      if (!uid) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Unauthorized' }),
        };
      }

      const sanitizedComment = sanitizeInput(commentData.comment || '', 500);
      if (!sanitizedComment) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Comment cannot be empty' }),
        };
      }

      // Prepare the comment record for Supabase
      let displayName = '';
      try {
        const { data: userRow } = await supabase
          .from('users')
          .select('name, username')
          .eq('id', isNaN(Number(uid)) ? uid : Number(uid))
          .single();
        displayName = sanitizeInput(
          userRow?.name || (userRow?.username ? `@${userRow.username}` : ''),
          100
        );
      } catch {}

      const record: Record<string, any> = {
        CardId: commentData.cardId,
        Name: displayName || '匿名用户',
        Comment: sanitizedComment,
        Created: new Date().toISOString(),
      };
      if (uid) record.UserId = uid;

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

      try {
        const { data: cardRow } = await supabase
          .from('cards')
          .select('id, Title, Username, Creator')
          .eq('id', commentData.cardId)
          .single();
        let ownerId: string | number | null = null;
        const ownerUsername = cardRow?.Username || null;
        const ownerCreator = cardRow?.Creator || null;
        if (ownerUsername) {
          const { data: ownerUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', ownerUsername)
            .single();
          ownerId = ownerUser?.id || null;
        }
        if (!ownerId && ownerCreator) {
          const { data: ownerByName } = await supabase
            .from('users')
            .select('id')
            .or(`username.eq.${ownerCreator},name.eq.${ownerCreator}`)
            .limit(1)
            .single();
          ownerId = ownerByName?.id || null;
        }
        if (ownerId && (!uid || String(ownerId) !== String(uid))) {
          const title = '卡片收到新评论';
          const snippet = sanitizedComment.length > 80 ? `${sanitizedComment.slice(0, 80)}...` : sanitizedComment;
          const content = `${displayName} 评论了你的卡片《${cardRow?.Title || ''}》：${snippet}`;
          const path = `/card-detail?id=${commentData.cardId}`;
          await createNotification(ownerId, title, content, path);
        }
      } catch (e) {
        console.error('[comments] createNotification failed:', e);
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
