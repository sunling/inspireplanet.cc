// 定义HTTP响应头接口
export type HttpHeaders = Record<string, string>;

// 定义Netlify事件接口
export interface NetlifyEvent {
  httpMethod: string;
  body?: string;
  headers: Record<string, string>;
  queryStringParameters?: Record<string, string>;
}

// 定义Netlify响应接口
export interface NetlifyResponse {
  statusCode: number;
  headers?: HttpHeaders;
  body: string;
}

// Netlify函数上下文接口
export interface NetlifyContext {
  clientContext?: {
    identity?: {
      url: string;
      token: string;
    };
    user?: {
      app_metadata?: Record<string, unknown>;
      user_metadata?: Record<string, unknown>;
      id: string;
      aud: string;
      email?: string;
    };
  };
}

// 定义通用API响应接口
export interface ApiResponse<T = any> {
  statusCode: number;
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

// 定义请求配置接口
export interface RequestConfig extends RequestInit {
  params?: Record<string, any>;
  timeout?: number;
}

// 定义HTTP客户端配置接口
export interface HttpClientConfig {
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
}
