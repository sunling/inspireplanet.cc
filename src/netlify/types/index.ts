export * from './http';

// 卡片数据接口 - 统一所有卡片相关的类型
export interface CardItem {
  id: string;
  user_id?: string;
  title: string;
  quote: string;
  detail?: string;
  image_path?: string;
  creator?: string;
  font?: string;
  gradient_class?: string;
  upload?: string;
  created: string;
  username?: string;
  likes_count?: number;
  update_time?: number;
}

// 评论数据接口
export interface CommentData {
  id?: string;
  name: string;
  comment: string;
  created: string;
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
  id?: string;
  name?: string;
  username?: string;
  wechat_id?: string;
  email?: string;
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
  city?: string | null;
  offerings?: string[] | null;
  seeking?: string[] | null;
  created_at?: string;
}

// 轮播卡片数据接口
export interface CarouselCardData {
  id: string;
  title: string;
  quote: string;
  image_path?: string;
  creator: string;
  font: string;
  gradient_class: string;
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
  card_id: string;
  name: string;
  comment: string;
  created_at: string;
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
