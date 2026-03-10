// 导出 HTTP 相关工具函数
import { http } from './helpers';

// 保持向后兼容性
export const getCommonHttpHeader = http.getCommonHeaders;
export const getBaseUrl = http.getBaseUrl;

export { http };
