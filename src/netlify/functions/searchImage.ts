import { requireMutationUser } from '../utils/authorization';
import {
  protectAction,
  shortText,
  MailProtectionError,
} from '../utils/mailProtection';
import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getFunctionNameFromEvent,
  getDataFromEvent,
} from '../utils/server';
import { searchImageByText } from '../utils/imageSearch';

export interface SearchImageAction {
  functionName: 'search';
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
      case 'search':
        return await handleSearch(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    if (error instanceof MailProtectionError)
      return createErrorResponse(error.message, error.status);
    console.error('Image search failed');
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleSearch(event: NetlifyEvent): Promise<NetlifyResponse> {
  const auth = await requireMutationUser(event, ['POST']);
  if (auth.error) return auth.error;
  const requestBody = getDataFromEvent(event);
  const text = shortText(requestBody.text, 500);
  const orientation: string = requestBody.orientation || 'landscape';

  if (!text || !['landscape', 'portrait', 'squarish'].includes(orientation)) {
    return createErrorResponse('缺少文本参数');
  }

  await protectAction(event, 'image-search', auth.user.id);
  try {
    const result = await searchImageByText(text, orientation);

    if (!result) {
      return createErrorResponse('搜索图片失败', 500);
    }

    return createSuccessResponse(result);
  } catch (error: any) {
    console.error('Error:', error);
    return createErrorResponse('处理请求错误', 500);
  }
}
