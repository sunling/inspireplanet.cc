// 基础URL设置
export const getBaseUrl = (): string => {
  // 浏览器环境下，使用当前域名（支持生产环境和本地开发服务器）
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Node.js环境下，根据环境变量确定
  if (process && process.env) {
    // Netlify环境变量（生产环境）
    if (process.env.URL) {
      return process.env.URL;
    }

    // Netlify开发环境
    if (process.env.NETLIFY_DEV || process.env.NETLIFY_LOCAL) {
      return 'http://localhost:8888';
    }

    // 自定义环境变量（如果设置）
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
  }

  // 默认返回生产环境地址，确保在任何情况下都能访问线上API
  return 'https://inspireplanet.cc';
};

// API端点定义
export const API_ENDPOINTS = {
  // 认证相关
  AUTH_HANDLER: '/.netlify/functions/authHandler',

  // 卡片相关
  CARDS_HANDLER: '/.netlify/functions/cardsHandler',
  GET_CARDS: '/.netlify/functions/getCards',

  // 每周卡片
  FETCH_WEEKLY_CARDS: '/.netlify/functions/fetchWeeklyCards',
  GET_LATEST_WEEKLY_CARDS: '/.netlify/functions/getLatestWeeklyCards',
  UPLOAD_WEEKLY_CARD: '/.netlify/functions/uploadWeeklyCard',

  // 活动相关
  MEETUP_HANDLER: '/.netlify/functions/meetupHandler',

  // RSVP相关
  RSVP_HANDLER: '/.netlify/functions/rsvpHandler',

  // 评论相关
  COMMENTS_HANDLER: '/.netlify/functions/commentsHandler',

  // 图片相关
  SEARCH_IMAGE: '/.netlify/functions/searchImage',
  UPLOAD_IMAGE: '/.netlify/functions/uploadImageToGitHub',

  // 用户相关
  USER_STATS: '/.netlify/functions/userStats',
  CHANGE_PASSWORD: '/.netlify/functions/changePassword',

  // 工作坊相关
  WORKSHOP_HANDLER: '/.netlify/functions/workshopHandler',
};

// 通用请求配置
interface RequestOptions extends RequestInit {
  requireAuth?: boolean;
}

// 通用请求函数
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requireAuth = false, headers = {}, ...restOptions } = options;

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // 如果需要认证，添加token
  if (requireAuth) {
    const token =
      localStorage.getItem('authToken') || localStorage.getItem('token');
    if (token) {
      (requestHeaders as any)['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    // 构建请求URL
    const url = `${getBaseUrl()}${endpoint}`;

    // 发送请求
    const response = await fetch(url, {
      headers: requestHeaders,
      ...restOptions,
    });

    // 检查响应是否成功
    if (!response.ok) {
      // 尝试获取响应内容
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // 非JSON响应时的错误处理
        const responseText = await response.text();
        throw new Error(
          `API请求失败: ${response.status} ${response.statusText}\n${responseText}`
        );
      }

      // 优先使用API提供的错误信息
      if (errorData.error || errorData.message) {
        throw new Error(errorData.error || errorData.message);
      }

      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    // 尝试解析JSON响应
    try {
      return await response.json();
    } catch (jsonError) {
      throw new Error('无效的JSON响应');
    }
  } catch (error) {
    console.error('API请求错误:', error);
    throw error;
  }
}

// 认证相关API
export const authAPI = {
  // 用户注册
  register: async (userData: {
    username: string;
    password: string;
    email: string;
    name: string;
  }) => {
    return request<{ success: boolean; token?: string; user?: any }>(
      API_ENDPOINTS.AUTH_HANDLER,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'register', ...userData }),
      }
    );
  },

  // 用户登录
  login: async (credentials: { username: string; password: string }) => {
    return request<{ success: boolean; token?: string; user?: any }>(
      API_ENDPOINTS.AUTH_HANDLER,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'login', ...credentials }),
      }
    );
  },

  // 验证token
  verifyToken: async (token: string) => {
    return request<{ valid: boolean; user?: any }>(API_ENDPOINTS.AUTH_HANDLER, {
      method: 'POST',
      body: JSON.stringify({ action: 'verify', token }),
    });
  },
};

// 卡片相关API
export const cardAPI = {
  // 获取所有卡片
  fetchCards: async () => {
    return request<{ records: any[] }>(API_ENDPOINTS.CARDS_HANDLER);
  },

  // 根据ID获取卡片
  fetchCardById: async (id: string) => {
    const response = await request<{ records: any[] }>(
      `${API_ENDPOINTS.CARDS_HANDLER}?id=${id}`
    );
    return response.records?.[0] || null;
  },

  // 创建卡片
  createCard: async (cardData: any) => {
    return request<{ success: boolean; data?: any }>(
      API_ENDPOINTS.CARDS_HANDLER,
      {
        method: 'POST',
        body: JSON.stringify(cardData),
        requireAuth: true,
      }
    );
  },

  // 更新卡片
  updateCard: async (id: string, cardData: any) => {
    return request<{ success: boolean; data?: any }>(
      API_ENDPOINTS.CARDS_HANDLER,
      {
        method: 'PUT',
        body: JSON.stringify({ id, ...cardData }),
        requireAuth: true,
      }
    );
  },

  // 删除卡片
  deleteCard: async (id: string) => {
    return request<{ success: boolean }>(
      `${API_ENDPOINTS.CARDS_HANDLER}?id=${id}`,
      {
        method: 'DELETE',
        requireAuth: true,
      }
    );
  },

  // 获取用户卡片
  fetchUserCards: async () => {
    return request<{ records: any[] }>(API_ENDPOINTS.GET_CARDS, {
      requireAuth: true,
    });
  },
};

// 每周卡片API
export const weeklyCardAPI = {
  // 获取所有每周卡片
  fetchWeeklyCards: async () => {
    return request<{ records: any[] }>(API_ENDPOINTS.FETCH_WEEKLY_CARDS);
  },

  // 获取最新的每周卡片
  fetchLatestWeeklyCards: async () => {
    return request<{ records: any[] }>(API_ENDPOINTS.GET_LATEST_WEEKLY_CARDS);
  },

  // 上传每周卡片
  uploadWeeklyCard: async (cardData: any) => {
    return request<{ success: boolean; data?: any }>(
      API_ENDPOINTS.UPLOAD_WEEKLY_CARD,
      {
        method: 'POST',
        body: JSON.stringify({ record: cardData }),
        requireAuth: true,
      }
    );
  },
};

// 活动相关API
export const meetupAPI = {
  // 获取所有活动
  fetchMeetups: async () => {
    return request<{ records: any[] }>(API_ENDPOINTS.MEETUP_HANDLER);
  },

  // 根据ID获取活动
  fetchMeetupById: async (id: string) => {
    const response = await request<{ records: any[] }>(
      `${API_ENDPOINTS.MEETUP_HANDLER}?id=${id}`
    );
    return response.records?.[0] || null;
  },

  // 创建活动
  createMeetup: async (meetupData: any) => {
    return request<{ success: boolean; data?: any }>(
      API_ENDPOINTS.MEETUP_HANDLER,
      {
        method: 'POST',
        body: JSON.stringify(meetupData),
        requireAuth: true,
      }
    );
  },

  // 更新活动
  updateMeetup: async (id: string, meetupData: any) => {
    return request<{ success: boolean; data?: any }>(
      API_ENDPOINTS.MEETUP_HANDLER,
      {
        method: 'PUT',
        body: JSON.stringify({ id, ...meetupData }),
        requireAuth: true,
      }
    );
  },

  // 删除活动
  deleteMeetup: async (id: string) => {
    return request<{ success: boolean }>(
      `${API_ENDPOINTS.MEETUP_HANDLER}?id=${id}`,
      {
        method: 'DELETE',
        requireAuth: true,
      }
    );
  },
};

// RSVP相关API
export const rsvpAPI = {
  // 获取活动的RSVP列表
  fetchRSVPs: async (meetupId: string) => {
    return request<{ records: any[] }>(
      `${API_ENDPOINTS.RSVP_HANDLER}?meetup_id=${meetupId}`
    );
  },

  // 创建RSVP
  createRSVP: async (rsvpData: {
    meetup_id: string;
    wechat_id: string;
    name: string;
  }) => {
    return request<{ success: boolean; data?: any }>(
      API_ENDPOINTS.RSVP_HANDLER,
      {
        method: 'POST',
        body: JSON.stringify(rsvpData),
      }
    );
  },

  // 检查是否已报名
  checkRSVP: async (meetupId: string, wechatId: string) => {
    const response = await request<{ records: any[] }>(
      `${API_ENDPOINTS.RSVP_HANDLER}?meetup_id=${meetupId}&wechat_id=${wechatId}`
    );
    return response.records?.length > 0;
  },
};

// 评论相关API
export const commentAPI = {
  // 获取卡片评论
  fetchComments: async (cardId: string) => {
    return request<{ records: any[] }>(
      `${API_ENDPOINTS.COMMENTS_HANDLER}?cardId=${encodeURIComponent(cardId)}`
    );
  },

  // 创建评论
  createComment: async (commentData: {
    cardId: string;
    name: string;
    comment: string;
  }) => {
    return request<{ success: boolean; data?: any }>(
      API_ENDPOINTS.COMMENTS_HANDLER,
      {
        method: 'POST',
        body: JSON.stringify(commentData),
      }
    );
  },
};

// 图片相关API
export const imageAPI = {
  // 搜索图片
  searchImage: async (
    text: string,
    orientation: 'landscape' | 'portrait' | 'squarish' = 'landscape'
  ) => {
    return request<{ images: Array<{ url: string; alt: string }> }>(
      API_ENDPOINTS.SEARCH_IMAGE,
      {
        method: 'POST',
        body: JSON.stringify({ text, orientation }),
      }
    );
  },

  // 上传图片到GitHub
  uploadImage: async (base64Image: string) => {
    return request<{ success: boolean; url?: string; error?: string }>(
      API_ENDPOINTS.UPLOAD_IMAGE,
      {
        method: 'POST',
        body: JSON.stringify({ base64Image }),
        requireAuth: true,
      }
    );
  },
};

// 用户相关API
export const userAPI = {
  // 获取用户统计信息
  fetchUserStats: async (userId: string) => {
    return request<{ stats: any }>(
      `${API_ENDPOINTS.USER_STATS}?userId=${userId}`,
      {
        requireAuth: true,
      }
    );
  },

  // 修改密码
  changePassword: async (passwordData: {
    oldPassword: string;
    newPassword: string;
  }) => {
    return request<{ success: boolean; message?: string }>(
      API_ENDPOINTS.CHANGE_PASSWORD,
      {
        method: 'POST',
        body: JSON.stringify(passwordData),
        requireAuth: true,
      }
    );
  },
};

// 工作坊相关API
export const workshopAPI = {
  // 注册工作坊
  registerWorkshop: async (workshopData: any) => {
    return request<{ success: boolean; message?: string }>(
      API_ENDPOINTS.WORKSHOP_HANDLER,
      {
        method: 'POST',
        body: JSON.stringify(workshopData),
      }
    );
  },
};

// 导出默认对象，方便整体导入
export default {
  getBaseUrl,
  API_ENDPOINTS,
  authAPI,
  cardAPI,
  weeklyCardAPI,
  meetupAPI,
  rsvpAPI,
  commentAPI,
  imageAPI,
  userAPI,
  workshopAPI,
};
