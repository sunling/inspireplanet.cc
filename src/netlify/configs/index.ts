// 导入http工具
import {
  AuthResponse,
  CardItem,
  WeeklyCard,
  WeeklyCardResponse,
  Comment,
  Meetup,
  Workshop,
} from '../types';
import { ApiResponse } from '../types/http';
import { http } from './http';

// 从http.ts导出所有内容
export * from './http';

// API端点定义 - 按功能模块分组
export const API_MAP = {
  // 认证相关
  AUTH: {
    LOGIN: '/auth',
    REGISTER: '/auth',
    VERIFY_TOKEN: '/auth',
    CHANGE_PASSWORD: '/auth', // 修改为/auth，通过action区分操作
  },

  // 卡片相关
  CARDS: {
    ROOT: '/cards',
    GET: '/cards',
    GET_USER_CARDS: '/cards', // 修改为/cards，通过query参数区分
    FETCH: '/cards', // 修改为/cards，通过query参数区分
    UPLOAD: '/uploadCard',
  },

  // 图片相关
  IMAGES: {
    UPLOAD: '/uploadImage', // 修改为驼峰命名，与函数名对应
    SEARCH: '/searchImage', // 修改为驼峰命名，与函数名对应
  },

  // 每周卡片
  WEEKLY_CARDS: {
    FETCH: '/weeklyCards', // 修改为驼峰命名，与函数名对应
    UPLOAD: '/uploadCard',
    GET_LATEST: '/weeklyCardLatest', // 修改为驼峰命名，与函数名对应
  },

  // 评论相关
  COMMENTS: {
    ROOT: '/comments',
  },

  // 会议相关
  MEETUPS: {
    ROOT: '/meetup',
    RSVP: '/rsvp',
  },

  // 工作坊相关
  WORKSHOP: {
    REGISTER: '/workshop', // 修改为/workshop，与函数名对应
  },

  // 联系我们 - 注意：没有对应的Netlify函数，可能需要创建
  CONTACT: {
    SEND_EMAIL: '/sendEmail',
  },
};

// 组织API请求
export const api = {
  // 认证相关API
  auth: {
    login: async (
      email: string,
      password: string
    ): Promise<ApiResponse<AuthResponse>> => {
      return http.post<AuthResponse>(API_MAP.AUTH.LOGIN, {
        action: 'login',
        email,
        password,
      });
    },

    register: async (data: {
      name: string;
      username: string;
      email: string;
      password: string;
      wechat?: string;
    }): Promise<ApiResponse<AuthResponse>> => {
      return http.post<AuthResponse>(API_MAP.AUTH.REGISTER, {
        action: 'register',
        ...data,
      });
    },

    verifyToken: async (): Promise<ApiResponse<AuthResponse>> => {
      return http.post<AuthResponse>(API_MAP.AUTH.VERIFY_TOKEN, {
        action: 'verify',
      });
    },

    changePassword: async (data: {
      email: string;
      oldPassword: string;
      newPassword: string;
    }): Promise<ApiResponse<{ success: boolean }>> => {
      return http.post<{ success: boolean }>(
        API_MAP.AUTH.CHANGE_PASSWORD,
        data
      );
    },
  },

  // 卡片相关API
  cards: {
    getAll: async (): Promise<ApiResponse<{ records: CardItem[] }>> => {
      return http.get<{ records: CardItem[] }>(API_MAP.CARDS.GET);
    },

    getById: async (
      id: string
    ): Promise<ApiResponse<{ records: CardItem[] }>> => {
      return http.get<{ records: CardItem[] }>(API_MAP.CARDS.FETCH, { id });
    },

    getUserCards: async (): Promise<ApiResponse<CardItem[]>> => {
      return http.get<CardItem[]>(API_MAP.CARDS.GET_USER_CARDS);
    },

    create: async (
      cardData: Partial<CardItem>
    ): Promise<ApiResponse<CardItem>> => {
      return http.post<CardItem>(API_MAP.CARDS.ROOT, cardData);
    },

    update: async (
      id: string,
      cardData: Partial<CardItem>
    ): Promise<ApiResponse<CardItem>> => {
      return http.put<CardItem>(API_MAP.CARDS.ROOT, {
        id,
        ...cardData,
      });
    },

    delete: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
      return http.delete<{ success: boolean }>(API_MAP.CARDS.ROOT, {
        id,
      });
    },
  },

  // 每周卡片API
  weeklyCards: {
    getAll: async (): Promise<ApiResponse<WeeklyCard[]>> => {
      return http.get<WeeklyCard[]>(API_MAP.WEEKLY_CARDS.FETCH);
    },

    getLatest: async (): Promise<ApiResponse<WeeklyCardResponse>> => {
      return http.get<WeeklyCardResponse>(API_MAP.WEEKLY_CARDS.GET_LATEST);
    },
  },

  // 评论相关API
  comments: {
    getByCardId: async (
      cardId: string
    ): Promise<ApiResponse<{ comments: Comment[] }>> => {
      return http.get<{ comments: Comment[] }>(API_MAP.COMMENTS.ROOT, {
        cardId,
      });
    },

    create: async (data: {
      cardId: string;
      name: string;
      comment: string;
    }): Promise<ApiResponse<Comment>> => {
      return http.post<Comment>(API_MAP.COMMENTS.ROOT, data);
    },
  },

  // 会议相关API
  meetups: {
    getAll: async (): Promise<ApiResponse<Meetup[]>> => {
      return http.get<Meetup[]>(API_MAP.MEETUPS.ROOT);
    },

    getById: async (id: string): Promise<ApiResponse<Meetup>> => {
      return http.get<Meetup>(API_MAP.MEETUPS.ROOT, { id });
    },

    create: async (
      meetupData: Partial<Meetup>
    ): Promise<ApiResponse<Meetup>> => {
      return http.post<Meetup>(API_MAP.MEETUPS.ROOT, meetupData);
    },

    update: async (
      id: string,
      meetupData: Partial<Meetup>
    ): Promise<ApiResponse<Meetup>> => {
      return http.put<Meetup>(API_MAP.MEETUPS.ROOT, {
        id,
        ...meetupData,
      });
    },

    delete: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
      return http.delete<{ success: boolean }>(API_MAP.MEETUPS.ROOT, {
        id,
      });
    },
  },

  // RSVP相关API
  rsvp: {
    create: async (rsvpData: any): Promise<ApiResponse<any>> => {
      return http.post<any>(API_MAP.MEETUPS.RSVP, rsvpData);
    },

    getByMeetupId: async (meetupId: string): Promise<ApiResponse<any[]>> => {
      return http.get<any[]>(API_MAP.MEETUPS.RSVP, {
        meetupId,
      });
    },
  },

  // 图片相关API
  images: {
    upload: async (
      base64Image: string
    ): Promise<ApiResponse<{ imageUrl: string }>> => {
      return http.post<{ imageUrl: string }>(API_MAP.IMAGES.UPLOAD, {
        base64Image,
      });
    },

    search: async (
      text: string,
      orientation?: string
    ): Promise<ApiResponse<any[]>> => {
      return http.post<any[]>(API_MAP.IMAGES.SEARCH, {
        text,
        orientation,
      });
    },
  },

  // 工作坊相关API
  workshop: {
    register: async (
      registrationData: Partial<Workshop>
    ): Promise<ApiResponse<{ success: boolean }>> => {
      return http.post<{ success: boolean }>(
        API_MAP.WORKSHOP.REGISTER,
        registrationData
      );
    },
  },

  // 联系我们API
  contact: {
    sendEmail: async (data: {
      name: string;
      email: string;
      message: string;
    }): Promise<ApiResponse<{ success: boolean }>> => {
      return http.post<{ success: boolean }>(API_MAP.CONTACT.SEND_EMAIL, data);
    },
  },
};
