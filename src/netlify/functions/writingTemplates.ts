import { supabase } from '../../database/supabase';
import { NetlifyEvent, NetlifyResponse } from '../types';
import {
  createErrorResponse,
  createSuccessResponse,
  getFunctionNameFromEvent,
  handleOptionsRequest,
} from '../utils/server';
import { mapWritingTemplate } from '../utils/writing';

export async function handler(event: NetlifyEvent): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') return handleOptionsRequest();

  const action = getFunctionNameFromEvent(event);
  if (action === 'getFilterOptions') {
    const { data, error } = await supabase
      .from('writing_templates')
      .select('id, name, version')
      .order('sort_order')
      .order('id');
    if (error) return createErrorResponse('获取书写模板失败', 500);
    return createSuccessResponse({
      templates: (data || []).map(({ id, name, version }) => ({
        id: String(id),
        name,
        version,
      })),
    });
  }

  if (action !== 'getAll') {
    return createErrorResponse('无效的操作类型');
  }

  const { data, error } = await supabase
    .from('writing_templates')
    .select('id, name, slug, description, prompts, version, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  if (error) return createErrorResponse('获取书写模板失败', 500);

  return createSuccessResponse({
    templates: (data || []).map(mapWritingTemplate),
  });
}
