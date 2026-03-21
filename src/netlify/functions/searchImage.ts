import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getFuntionNameFromEvent,
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
    const functionName = getFuntionNameFromEvent(event);

    switch (functionName) {
      case 'search':
        return await handleSearch(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('SearchImage handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleSearch(event: NetlifyEvent): Promise<NetlifyResponse> {
  const requestBody = getDataFromEvent(event);
  const text: string = requestBody.text || '';
  const orientation: string = requestBody.orientation || 'landscape';

  if (!text) {
    return createErrorResponse('缺少文本参数');
  }

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
