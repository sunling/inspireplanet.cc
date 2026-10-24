import { requireMutationUser } from '../utils/authorization';
// src/netlify/functions/weeklyCards.ts
import { WeeklyCard } from '../services/weeklyCards';
import { NetlifyContext, NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  getAllWeeklyCards,
  getEpisodeSummary,
  getWeeklyCardsByEpisode,
} from '../utils/githubWeeklyCards';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getFunctionNameFromEvent,
  getDataFromEvent,
} from '../utils/server';

export async function handler(
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const functionName = getFunctionNameFromEvent(event);

    switch (functionName) {
      case 'getAll':
        return await handleGetAll(event);
      case 'getByEpisode':
        return await handleGetByEpisode(event);
      case 'getAllLimited':
        return await handleGetAllLimited(event);
      case 'create':
        return await handleCreate(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('Function error:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

async function handleGetAll(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const records = await getAllWeeklyCards();
    return createSuccessResponse({ records } as {
      records: WeeklyCard[];
    });
  } catch (error) {
    console.error('Function error:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

async function handleGetByEpisode(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  try {
    const data = getDataFromEvent(event);
    const episode = data.episode;
    const year = data.year;

    if (!episode) {
      return createErrorResponse('缺少期数参数');
    }

    const [records, summary] = await Promise.all([
      getWeeklyCardsByEpisode(String(episode), year),
      getEpisodeSummary(String(episode), year),
    ]);

    return createSuccessResponse({ records, summary });
  } catch (error) {
    console.error('Function error:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}

async function handleGetAllLimited(
  event: NetlifyEvent
): Promise<NetlifyResponse> {
  try {
    const data = getDataFromEvent(event);
    const limit = parseInt(data.limit as string, 10);

    if (isNaN(limit) || limit <= 0) {
      return createErrorResponse('无效的限制参数');
    }

    const records = await getAllWeeklyCards(limit);

    return createSuccessResponse({ records } as {
      records: WeeklyCard[];
    });
  } catch (error) {
    console.error('Function error:', error);
    return createErrorResponse('Internal Server Error', 500);
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
