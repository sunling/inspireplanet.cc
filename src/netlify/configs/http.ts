import {
  ApiResponse,
  HttpClientConfig,
  HttpHeaders,
  RequestConfig,
} from '../types/http';

const DEFAULT_HEADER: HttpHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

// HTTP客户端类
class HttpClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number;

  constructor(config: HttpClientConfig = {}) {
    // 根据环境确定baseURL，允许外部配置覆盖
    this.baseURL =
      config.baseURL ||
      (import.meta.env.DEV
        ? '/.netlify/functions'
        : `${window.location.origin}/.netlify/functions`);

    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.defaultHeaders,
    };

    this.defaultTimeout = config.timeout || 30000; // 默认30秒超时
  }

  // 获取认证token
  private getAuthToken(): string | null {
    try {
      return (
        localStorage.getItem('authToken') || localStorage.getItem('userToken')
      );
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return null;
    }
  }

  // 构建完整URL
  private buildUrl(moduleName: string, params?: Record<string, any>): string {
    // 处理绝对URL
    if (moduleName.startsWith('http://') || moduleName.startsWith('https://')) {
      if (!params || Object.keys(params).length === 0) {
        return moduleName;
      }

      const separator = moduleName.includes('?') ? '&' : '?';
      const queryString = this.buildQueryString(params);
      return `${moduleName}${separator}${queryString}`;
    }

    // 确保moduleName不包含重复的/.netlify/functions
    const cleanmoduleName = moduleName.startsWith('/.netlify/functions')
      ? moduleName.replace('/.netlify/functions', '')
      : moduleName;

    const url = `${this.baseURL}${
      cleanmoduleName.startsWith('/') ? '' : '/'
    }${cleanmoduleName}`;

    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    return `${url}?${this.buildQueryString(params)}`;
  }

  // 构建查询字符串
  private buildQueryString(params: Record<string, any>): string {
    return Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
      )
      .join('&');
  }

  // 请求拦截器
  private requestInterceptor(config: RequestConfig): RequestConfig {
    const token = this.getAuthToken();
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    return config;
  }

  // 响应拦截器
  private async responseInterceptor<T>(
    response: Response
  ): Promise<ApiResponse<T>> {
    let data: any;

    try {
      data = await response.json();
    } catch (error) {
      // 非JSON响应处理
      const textResponse = await response.text().catch(() => '');
      return Promise.reject({
        success: false,
        statusCode: -1,
        error: 'Invalid response format',
        details: { text: textResponse },
      });
    }

    if (!response.ok) {
      // 处理HTTP错误
      const errorMessage =
        data.error ||
        data.message ||
        `HTTP Error: ${response.status} ${response.statusText}`;

      return Promise.reject({
        success: false,
        statusCode: -1,
        error: errorMessage,
        details: data,
      });
    }

    // 统一响应格式
    return Promise.resolve({
      statusCode: 200,
      success: true,
      data: data.data || data,
      message: data.message,
      details: data.details || undefined,
    });
  }

  // 超时处理
  private withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);

      promise
        .then((value) => {
          clearTimeout(timeoutId);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  // 通用请求方法
  async request<T = any>(
    moduleName: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      // 合并默认配置和用户配置
      const mergedConfig: RequestConfig = {
        headers: {
          ...this.defaultHeaders,
          ...config.headers,
        },
        credentials: config.credentials || 'same-origin',
        ...config,
      };
      // 应用请求拦截器
      const interceptedConfig = this.requestInterceptor(mergedConfig);

      // 构建URL
      const url = this.buildUrl(moduleName, interceptedConfig.params);

      // 移除params，因为已经构建到URL中
      const { params, timeout, ...fetchConfig } = interceptedConfig;

      // 创建fetch请求
      let fetchPromise = fetch(url, fetchConfig).then((response) =>
        this.responseInterceptor<T>(response)
      );

      // 应用超时处理（使用默认超时或配置的超时）
      const timeoutValue =
        timeout !== undefined ? timeout : this.defaultTimeout;
      fetchPromise = this.withTimeout(fetchPromise, timeoutValue);

      return await fetchPromise;
    } catch (error: any) {
      console.error('HTTP Request Error:', error);
      return {
        success: false,
        statusCode: -1,
        error: error.message || 'Network error',
        details: error,
      };
    }
  }

  // GET方法
  async get<T = any>(
    moduleName: string,
    params?: Record<string, any>,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(moduleName, {
      ...config,
      method: 'GET',
      params,
    });
  }

  // POST方法
  async post<T = any>(
    moduleName: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(moduleName, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT方法
  async put<T = any>(
    moduleName: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(moduleName, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE方法
  async delete<T = any>(
    moduleName: string,
    params?: Record<string, any>,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(moduleName, {
      ...config,
      method: 'DELETE',
      params,
    });
  }
}

// 创建并导出单例实例
export const httpClient = new HttpClient({ defaultHeaders: DEFAULT_HEADER });

// 导出便捷方法
export const http = {
  // 请求配置方法
  createClient: (config: HttpClientConfig) => new HttpClient(config),

  // HTTP方法
  get: <T = any>(
    moduleName: string,
    params?: Record<string, any>,
    config?: RequestConfig
  ) => httpClient.get<T>(moduleName, params, config),
  post: <T = any>(moduleName: string, data?: any, config?: RequestConfig) =>
    httpClient.post<T>(moduleName, data, config),
  put: <T = any>(moduleName: string, data?: any, config?: RequestConfig) =>
    httpClient.put<T>(moduleName, data, config),
  delete: <T = any>(
    moduleName: string,
    params?: Record<string, any>,
    config?: RequestConfig
  ) => httpClient.delete<T>(moduleName, params, config),

  // 直接使用request方法
  request: <T = any>(moduleName: string, config?: RequestConfig) =>
    httpClient.request<T>(moduleName, config),
};
