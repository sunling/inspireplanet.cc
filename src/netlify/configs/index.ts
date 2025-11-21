// 导入http工具
import {
  AuthResponse,
  CardItem,
  WeeklyCard,
  WeeklyCardResponse,
  Comment,
  Meetup,
  Workshop,
  SearchImageItem,
  Participant,
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

  // 人员与一对一
  PEOPLE: {
    LIST: '/users',
  },
  ONEONONE: {
    INVITES: '/oneononeInvites',
    MEETINGS: '/oneononeMeetings',
  },
  PROFILE: {
    ROOT: '/userProfile',
  },
  NOTIFICATIONS: {
    ROOT: '/notifications',
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
    getAll: async (): Promise<ApiResponse<{ records: WeeklyCard[] }>> => {
      return http.get<{ records: WeeklyCard[] }>(API_MAP.WEEKLY_CARDS.FETCH);
    },

    getLatest: async (): Promise<ApiResponse<WeeklyCardResponse>> => {
      return http.get<WeeklyCardResponse>(API_MAP.WEEKLY_CARDS.GET_LATEST);
    },

    getByEpisode: async (
      episode: string
    ): Promise<ApiResponse<{ records: WeeklyCard[] }>> => {
      return http.get<{ records: WeeklyCard[] }>(API_MAP.WEEKLY_CARDS.FETCH, {
        episode,
      });
    },

    getAllLimited: async (
      limit: number
    ): Promise<ApiResponse<{ records: WeeklyCard[] }>> => {
      return http.get<{ records: WeeklyCard[] }>(API_MAP.WEEKLY_CARDS.FETCH, {
        limit,
      });
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
    getAll: async (): Promise<ApiResponse<{ meetups: Meetup[] }>> => {
      return http.get<{ meetups: Meetup[] }>(API_MAP.MEETUPS.ROOT);
    },

    getById: async (
      id: string
    ): Promise<ApiResponse<{ meetups: Meetup[] }>> => {
      return http.get<{ meetups: Meetup[] }>(API_MAP.MEETUPS.ROOT, { id });
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

    getByMeetupId: async (
      meetupId: string
    ): Promise<ApiResponse<{ rsvps: Participant[] }>> => {
      return http.get<{ rsvps: Participant[] }>(API_MAP.MEETUPS.RSVP, {
        meetupId,
      });
    },
  },

  people: {
    list: async (
      params?: { q?: string; offering?: string; seeking?: string; interest?: string; expertise?: string; theme?: string }
    ): Promise<ApiResponse<{ users: import('../types').PeopleUser[] }>> => {
      return http.get<{ users: import('../types').PeopleUser[] }>(
        API_MAP.PEOPLE.LIST,
        params as any
      )
    },
    getById: async (
      id: string | number
    ): Promise<ApiResponse<{ users: import('../types').PeopleUser[] }>> => {
      return http.get<{ users: import('../types').PeopleUser[] }>(API_MAP.PEOPLE.LIST, { id } as any)
    },
  },

  oneonone: {
    invites: {
      create: async (
        data: Partial<import('../types').OneOnOneInvite> & { invitee_id: string }
      ): Promise<ApiResponse<{ invite: import('../types').OneOnOneInvite }>> => {
        return http.post<{ invite: import('../types').OneOnOneInvite }>(
          API_MAP.ONEONONE.INVITES,
          data
        )
      },
      list: async (
        role: 'inviter' | 'invitee' = 'invitee',
        status?: 'pending' | 'accepted' | 'declined' | 'cancelled'
      ): Promise<ApiResponse<{ invites: import('../types').OneOnOneInvite[] }>> => {
        const params: Record<string, any> = { role }
        if (status) params.status = status
        return http.get<{ invites: import('../types').OneOnOneInvite[] }>(
          API_MAP.ONEONONE.INVITES,
          params
        )
      },
      update: async (
        id: string,
        data: Partial<import('../types').OneOnOneInvite>
      ): Promise<ApiResponse<{ invite: import('../types').OneOnOneInvite }>> => {
        return http.put<{ invite: import('../types').OneOnOneInvite }>(
          API_MAP.ONEONONE.INVITES,
          { id, ...data }
        )
      },
    },
    meetings: {
      create: async (
        data: Partial<import('../types').OneOnOneMeeting>
      ): Promise<ApiResponse<{ meeting: import('../types').OneOnOneMeeting }>> => {
        return http.post<{ meeting: import('../types').OneOnOneMeeting }>(
          API_MAP.ONEONONE.MEETINGS,
          data
        )
      },
      list: async (): Promise<ApiResponse<{ meetings: import('../types').OneOnOneMeeting[] }>> => {
        return http.get<{ meetings: import('../types').OneOnOneMeeting[] }>(
          API_MAP.ONEONONE.MEETINGS
        )
      },
      update: async (
        id: string,
        data: Partial<import('../types').OneOnOneMeeting>
      ): Promise<ApiResponse<{ meeting: import('../types').OneOnOneMeeting }>> => {
        return http.put<{ meeting: import('../types').OneOnOneMeeting }>(
          API_MAP.ONEONONE.MEETINGS,
          { id, ...data }
        )
      },
    },
  },

  notifications: {
    list: async (
      params?: { status?: 'unread' | 'read'; limit?: number; offset?: number }
    ): Promise<ApiResponse<{ notifications: any[] }>> => {
      return http.get<{ notifications: any[] }>(API_MAP.NOTIFICATIONS.ROOT, params as any)
    },
    markRead: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
      return http.put<{ success: boolean }>(API_MAP.NOTIFICATIONS.ROOT, { id })
    },
    markAllRead: async (): Promise<ApiResponse<{ success: boolean }>> => {
      return http.put<{ success: boolean }>(API_MAP.NOTIFICATIONS.ROOT, { all: true })
    },
  },

  profile: {
    getMy: async (): Promise<ApiResponse<{ profile: import('../types').UserProfile | null }>> => {
      return http.get<{ profile: import('../types').UserProfile | null }>(API_MAP.PROFILE.ROOT)
    },
    upsert: async (
      data: Partial<import('../types').UserProfile>
    ): Promise<ApiResponse<{ profile: import('../types').UserProfile }>> => {
      return http.post<{ profile: import('../types').UserProfile }>(API_MAP.PROFILE.ROOT, data)
    },
  },

  // 图片相关API
  images: {
    upload: async (
      base64Image: string
    ): Promise<ApiResponse<{ url: string }>> => {
      return http.post<{ url: string }>(API_MAP.IMAGES.UPLOAD, {
        base64Image,
      });
    },

    search: async (
      text: string,
      orientation?: string
    ): Promise<ApiResponse<{ query: string; images: SearchImageItem[] }>> => {
      return http.post<{ query: string; images: SearchImageItem[] }>(
        API_MAP.IMAGES.SEARCH,
        {
          text,
          orientation,
        }
      );
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
