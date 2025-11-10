export * from './http';

// 卡片数据接口 - 统一所有卡片相关的类型
export interface CardData {
  id: string;
  title: string;
  quote: string;
  detail?: string;
  imagePath?: string;
  creator?: string;
  font?: string;
  gradientClass?: string;
  upload?: string;
  created: string;
  username?: string;
}

// 评论数据接口
export interface CommentData {
  id?: string;
  name: string;
  comment: string;
  created: string;
}

// 周刊卡片接口
export interface WeeklyCard {
  id: string;
  episode: string;
  name: string;
  title: string;
  quote: string;
  detail: string;
  imagePath?: string;
  created: string;
}

// 周刊卡片记录接口（数据库用）
export interface WeeklyCardRecord {
  episode: string;
  name: string;
  title: string;
  quote: string;
  detail: string;
}

// 周刊卡片请求接口
export interface WeeklyCardRequest {
  record: WeeklyCardRecord;
}

// 周刊卡片响应接口
export interface WeeklyCardResponse {
  success: boolean;
  error?: string;
  message?: string;
  id?: number;
  missingFields?: string[];
  details?: string;
  records: WeeklyCard[];
}

// 聚会数据接口
export interface Meetup {
  id: string;
  title: string;
  description: string;
  type: 'online' | 'offline' | 'culture' | 'outdoor';
  mode?: 'online' | 'offline';
  datetime: string;
  location?: string;
  fee: string | number | null | undefined;
  max_ppl?: number;
  max_participants?: number;
  duration?: number;
  organizer: string;
  creator?: string;
  contact: string;
  qr_image_url?: string;
  status: 'upcoming' | 'ongoing' | 'ended';
  created_at: string;
  participant_count: number;
  cover?: string;
}

// 参与者接口
export interface Participant {
  name: string;
  wechat_id?: string;
  created_at?: string;
}

// 用户信息接口
export interface UserInfo {
  name?: string;
  wechat_id?: string;
  username?: string;
}

// 轮播卡片数据接口
export interface CarouselCardData {
  id: string;
  title: string;
  quote: string;
  imagePath?: string;
  creator: string;
  font: string;
  gradientClass: string;
}

// 搜索图片结果接口
export interface SearchImageResult {
  url: string;
  thumb: string;
  title: string;
  description: string;
}

// 搜索图片响应接口
export interface SearchImageResponse {
  images?: Array<{
    url: string;
  }>;
}

// 定义常用数据类型
export interface Card {
  id: string;
  title: string;
  content: string;
  category: string;
  imageUrl?: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  // 移除任意属性以增强类型安全
}

export interface Comment {
  id: string;
  cardId: string;
  name: string;
  comment: string;
  createdAt: string;
  [key: string]: any;
}

export interface AuthResponse {
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    username: string;
    [key: string]: any;
  };
  [key: string]: any;
}
