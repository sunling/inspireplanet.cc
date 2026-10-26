import { randomUUID } from 'crypto';
import { supabase } from '../../database/supabase';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createErrorResponse,
  createSuccessResponse,
  getDataFromEvent,
  getFunctionNameFromEvent,
  getUserIdFromAuth,
  handleOptionsRequest,
} from '../utils/server';

const QR_BUCKETS = {
  community: 'community-qrcode',
  speakers: 'speaker-qrcode',
} as const;
const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') return handleOptionsRequest();

  try {
    const functionName = getFunctionNameFromEvent(event);
    const { group = 'community' } = getDataFromEvent(event);
    if (group !== 'community' && group !== 'speakers') {
      return createErrorResponse('无效的群类型');
    }
    const bucket = QR_BUCKETS[group];
    if (functionName === 'current') {
      if (event.httpMethod !== 'GET')
        return createErrorResponse('不支持的请求方法', 405);
      return await handleCurrent(bucket);
    }
    if (functionName === 'update') {
      if (event.httpMethod !== 'POST')
        return createErrorResponse('不支持的请求方法', 405);
      return await handleUpdate(event, bucket);
    }
    return createErrorResponse('无效的操作类型');
  } catch (error) {
    console.error('Community QR handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function listQrFiles(bucket: string) {
  return supabase.storage.from(bucket).list('', {
    limit: 20,
    sortBy: { column: 'name', order: 'desc' },
  });
}

async function handleCurrent(bucket: string): Promise<NetlifyResponse> {
  const { data, error } = await listQrFiles(bucket);

  if (error) {
    if (/not found|does not exist/i.test(error.message)) {
      return createSuccessResponse({ imageUrl: null, updatedAt: null });
    }
    console.error('List community QR files error:', error);
    return createErrorResponse('暂时无法读取入群二维码', 500);
  }

  const current = data?.find((item) => item.id !== null);
  if (!current) {
    return createSuccessResponse({ imageUrl: null, updatedAt: null });
  }

  const { data: publicUrl } = supabase.storage
    .from(bucket)
    .getPublicUrl(current.name);

  return createSuccessResponse({
    imageUrl: publicUrl.publicUrl,
    updatedAt: current.updated_at || current.created_at || null,
  });
}

async function handleUpdate(
  event: NetlifyEvent,
  bucket: string
): Promise<NetlifyResponse> {
  const userId = await getUserIdFromAuth(event);
  if (!userId) return createErrorResponse('请先登录', 401);

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (userError || user?.role !== 'organizer') {
    return createErrorResponse('没有权限更新入群二维码', 403);
  }

  const { base64Image } = getDataFromEvent(event) as {
    base64Image?: string;
  };
  const match = base64Image?.match(
    /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/
  );
  if (!match) {
    return createErrorResponse('请选择 PNG、JPG 或 WebP 图片');
  }

  const contentType = match[1];
  const extension = ALLOWED_TYPES[contentType];
  const fileBuffer = Buffer.from(match[2], 'base64');
  if (!fileBuffer.length || fileBuffer.length > MAX_FILE_SIZE) {
    return createErrorResponse('图片大小不能超过 3MB');
  }

  const { data: buckets, error: bucketsError } =
    await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error('List buckets error:', bucketsError);
    return createErrorResponse('无法检查图片存储空间', 500);
  }

  if (!buckets?.some((bucketInfo) => bucketInfo.id === bucket)) {
    const { error: createBucketError } = await supabase.storage.createBucket(
      bucket,
      {
        public: true,
        allowedMimeTypes: Object.keys(ALLOWED_TYPES),
        fileSizeLimit: MAX_FILE_SIZE,
      }
    );
    if (createBucketError) {
      console.error('Create community QR bucket error:', createBucketError);
      return createErrorResponse('无法创建图片存储空间', 500);
    }
  }

  const { data: oldFiles, error: listError } = await listQrFiles(bucket);
  if (listError) {
    console.error('List old community QR files error:', listError);
    return createErrorResponse('无法读取旧二维码', 500);
  }

  const filename = `${Date.now()}-${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filename, fileBuffer, {
      contentType,
      cacheControl: '31536000',
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload community QR error:', uploadError);
    return createErrorResponse('二维码上传失败', 500);
  }

  const oldNames =
    oldFiles?.filter((item) => item.id !== null).map((item) => item.name) || [];
  let cleanupComplete = true;
  if (oldNames.length) {
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove(oldNames);
    if (removeError) {
      cleanupComplete = false;
      console.error('Remove old community QR files error:', removeError);
    }
  }

  const { data: publicUrl } = supabase.storage
    .from(bucket)
    .getPublicUrl(filename);

  return createSuccessResponse({
    imageUrl: publicUrl.publicUrl,
    updatedAt: new Date().toISOString(),
    cleanupComplete,
  });
}
