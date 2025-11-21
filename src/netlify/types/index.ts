export * from './http';

// 卡片数据接口 - 统一所有卡片相关的类型
export interface CardItem {
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

export enum MeetupStatus {
  'UPCOMING' = 'upcoming',
  'ONGOING' = 'ongoing',
  'ACTIVE' = 'active',
  'END' = 'end',
  'CANCEL' = 'cancelled',
}

export enum MeetupType {
  'ONLINE' = 'online',
  'OFFLINE' = 'offline',
  'CULTURE' = 'culture',
  'OUTDOOR' = 'outdoor',
}

export enum MeetupMode {
  'ONLINE' = 'online',
  'OFFLINE' = 'offline',
}

// 聚会数据接口
export interface Meetup {
  id: string;
  title: string;
  description: string;
  type: MeetupType;
  mode?: MeetupMode;
  datetime: string;
  location?: string;
  max_ppl?: number;
  max_participants?: number;
  duration?: number;
  organizer: string;
  creator?: string;
  contact: string;
  qr_image_url?: string;
  status: MeetupStatus;
  created_at: string;
  participant_count: number;
  cover?: string;
  wechat_id?: string;
  user_id?: string;
  qrcode?: string;
  // todo: 会议费用,目前未看到接口返回
  fee?: string | number | null | undefined;
}

// 参与者接口
export interface Participant {
  id?: string;
  meetup_id?: string;
  username?: string;
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

export interface PeopleUser {
  id: string | number;
  name: string;
  username: string;
  profile?: UserProfile | null;
}

export interface OneOnOneInvite {
  id: string;
  inviter_id: string;
  invitee_id: string;
  message?: string;
  proposed_slots?: Array<{ datetime_iso: string; mode: 'online' | 'offline' }>;
  selected_slot?: { datetime_iso: string; mode: 'online' | 'offline' } | null;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  created_at?: string;
}

export interface OneOnOneMeeting {
  id: string;
  invite_id: string;
  final_datetime_iso: string;
  mode: 'online' | 'offline';
  location_text?: string | null;
  meeting_url?: string | null;
  notes?: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at?: string;
}

export interface UserProfile {
  id?: string;
  user_id: string | number;
  bio?: string | null;
  topics?: string[] | null;
  interests?: string[] | null;
  expertise?: string[] | null;
  availability_text?: string | null;
  timezone?: string | null;
  wechat_id?: string | null;
  offerings?: string[] | null;
  seeking?: string[] | null;
  created_at?: string;
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

export interface Workshop {
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

export interface Credit {
  name: string;
  username: string;
  link: string;
}

export interface SearchImageItem {
  url: string;
  thumb: string;
  title: string;
  description: string;
  credits: Credit;
}
