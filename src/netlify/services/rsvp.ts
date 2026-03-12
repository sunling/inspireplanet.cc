import { ApiResponse } from '../types/http';
import { Participant } from '../types';
import { http } from '../config/http';

export const rsvpApi = {
  create: async (rsvpData: any): Promise<ApiResponse<any>> => {
    return http.post<any>('/rsvp', 'create', rsvpData);
  },

  update: async (
    id: string | number,
    data: Partial<import('../types').Participant>
  ): Promise<ApiResponse<{ rsvp: import('../types').Participant }>> => {
    return http.put<{ rsvp: import('../types').Participant }>(
      '/rsvp',
      'update',
      data,
      {
        params: { id } as any,
      }
    );
  },

  getByUserId: async (
    userId: string | number
  ): Promise<ApiResponse<{ rsvps: Participant[] }>> => {
    return http.get<{ rsvps: Participant[] }>('/rsvp', 'getByUserId', {
      user_id: userId,
    } as any);
  },

  getByMeetupId: async (
    meetupId: string
  ): Promise<ApiResponse<{ rsvps: Participant[] }>> => {
    return http.get<{ rsvps: Participant[] }>('/rsvp', 'getByMeetupId', {
      meetup_id: meetupId,
    });
  },

  getByWechatId: async (
    wechatId: string
  ): Promise<ApiResponse<{ rsvps: Participant[] }>> => {
    return http.get<{ rsvps: Participant[] }>('/rsvp', 'getByWechatId', {
      wechat_id: wechatId,
    });
  },

  cancel: async (
    id: string | number
  ): Promise<ApiResponse<{ success: boolean }>> => {
    return http.delete<{ success: boolean }>('/rsvp', 'cancel', {
      id,
    } as any);
  },
  cancelByMeetupWechat: async (
    meetupId: string | number,
    wechatId: string
  ): Promise<ApiResponse<{ success: boolean }>> => {
    return http.delete<{ success: boolean }>('/rsvp', 'cancelByMeetupWechat', {
      meetup_id: meetupId,
      wechat_id: wechatId,
    } as any);
  },
};

export default rsvpApi;
