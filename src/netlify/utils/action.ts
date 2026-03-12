import { NetlifyEvent } from '../types/http';

/**
 * 从Netlify事件中获取action参数
 * 支持GET请求（从queryStringParameters）和POST/PUT/DELETE请求（从body）
 * @param event Netlify事件对象
 * @returns action参数值
 */
export function getActionFromEvent(event: NetlifyEvent): string | undefined {
  // GET请求从queryStringParameters获取
  if (event.httpMethod === 'GET' || event.httpMethod === 'DELETE') {
    return event.queryStringParameters?.action;
  }

  // POST/PUT请求从body获取
  try {
    if (event.body) {
      const body = JSON.parse(event.body);
      return body.action;
    }
  } catch (error) {
    console.error('Error parsing body:', error);
  }

  return undefined;
}

/**
 * 从Netlify事件中获取请求数据
 * 支持GET请求（从queryStringParameters）和POST/PUT/DELETE请求（从body）
 * @param event Netlify事件对象
 * @returns 请求数据对象
 */
export function getDataFromEvent(event: NetlifyEvent): any {
  // GET/DELETE请求从queryStringParameters获取
  if (event.httpMethod === 'GET' || event.httpMethod === 'DELETE') {
    return event.queryStringParameters || {};
  }

  // POST/PUT请求从body获取
  try {
    if (event.body) {
      const res = JSON.parse(event.body);
      if (res['action']) {
        delete res['action'];
      }
      return res || {};
    }
  } catch (error) {
    console.error('Error parsing body:', error);
  }

  return {};
}
