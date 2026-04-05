import { NetlifyEvent } from '../types/http';

/**
 * 从Netlify事件中获取action参数
 * 支持GET请求（从queryStringParameters）和POST/PUT/DELETE请求（从body）
 * @param event Netlify事件对象
 * @returns action参数值
 */
export function getFuntionNameFromEvent(
  event: NetlifyEvent
): string | undefined {
  console.log('🔍 getFuntionNameFromEvent called with:', {
    method: event.httpMethod,
    query: event.queryStringParameters,
    hasBody: !!event.body,
  });
  
  // GET请求从queryStringParameters获取（优先 functionName，兼容 action）
  if (event.httpMethod === 'GET' || event.httpMethod === 'DELETE') {
    const result = event.queryStringParameters?.functionName || event.queryStringParameters?.action;
    console.log('  → GET/DELETE query result:', result);
    return result;
  }

  // POST/PUT请求从body获取（优先 functionName，兼容 action）
  try {
    if (event.body) {
      const body = JSON.parse(event.body);
      const result = body.functionName || body.action;
      console.log('  → POST/PUT body result:', result, 'body:', body);
      return result;
    }
  } catch (error) {
    console.error('Error parsing body:', error);
  }

  console.log('  → No functionName/action found, returning undefined');
  return undefined;
}

/**
 * 从Netlify事件中获取请求数据
 * 支持GET请求（从queryStringParameters）和POST/PUT/DELETE请求（从body）
 * @param event Netlify事件对象
 * @returns 请求数据对象
 */
export function getDataFromEvent(event: NetlifyEvent): any {
  console.log('📦 getDataFromEvent called with:', {
    method: event.httpMethod,
    hasBody: !!event.body,
  });
  
  // GET/DELETE请求从queryStringParameters获取
  if (event.httpMethod === 'GET' || event.httpMethod === 'DELETE') {
    const result = { ...event.queryStringParameters };
    // 移除 action/functionName 字段，避免污染数据
    delete result['action'];
    delete result['functionName'];
    console.log('  → GET/DELETE result:', result);
    return result || {};
  }

  // POST/PUT请求从body获取
  try {
    if (event.body) {
      const res = JSON.parse(event.body);
      const result = { ...res };
      // 移除 action/functionName 字段，避免污染数据
      delete result['action'];
      delete result['functionName'];
      console.log('  → POST/PUT result:', result);
      return result || {};
    }
  } catch (error) {
    console.error('Error parsing body:', error);
  }

  return {};
}
