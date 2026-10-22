import { requireMutationUser } from '../utils/authorization';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createErrorResponse,
  handleOptionsRequest,
  getFunctionNameFromEvent,
} from '../utils/server';

export interface WeeklyCardRecord {
  episode: string;
  name: string;
  title: string;
  quote: string;
  detail: string;
  image_path?: string | null;
}

export interface WeeklyCardRequest {
  record: WeeklyCardRecord;
}

export interface WeeklyCardResponse {
  success: boolean;
  error?: string;
  message?: string;
  details?: string;
  id?: string;
}

export interface UploadCardAction {
  functionName: 'create';
}

export async function handler(
  event: NetlifyEvent,
  context: any
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const functionName = getFunctionNameFromEvent(event);

    switch (functionName) {
      case 'create':
        return await handleCreate(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('UploadCard handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleCreate(event: NetlifyEvent): Promise<NetlifyResponse> {
  const auth = await requireMutationUser(event, ['POST'], true);
  if (auth.error) return auth.error;
  return createErrorResponse(
    '旧周卡写入入口已停用，请在 sunling/inspire-planet 仓库维护周刊内容',
    410
  );
}
