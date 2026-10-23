import { NetlifyEvent, NetlifyResponse } from '../types/http';
import { getLatestWeeklyCards } from '../utils/githubWeeklyCards';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getFunctionNameFromEvent,
} from '../utils/server';

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
      case 'getLatestWeeklyCards':
        return await handleGetLatestWeeklyCards(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('WeeklyCardLatest handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleGetLatestWeeklyCards(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  try {
    const records = await getLatestWeeklyCards();
    return createSuccessResponse({ records });
  } catch (error) {
    console.error('Function error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}
