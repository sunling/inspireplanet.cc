import { ApiResponse } from '../types/http';
import { http } from '../config/http';

export const oneOnOneApi = {
  invites: {
    create: async (
      data: Partial<import('../types').OneOnOneInvite> & {
        invitee_id: string;
      }
    ): Promise<ApiResponse<{ invite: import('../types').OneOnOneInvite }>> => {
      return http.post<{ invite: import('../types').OneOnOneInvite }>(
        '/oneOnOneInvites',
        'create',
        data
      );
    },
    list: async (
      role: 'inviter' | 'invitee' = 'invitee',
      status?: 'pending' | 'accepted' | 'declined' | 'cancelled'
    ): Promise<
      ApiResponse<{ invites: import('../types').OneOnOneInvite[] }>
    > => {
      const params: Record<string, any> = { role };
      if (status) params.status = status;
      return http.get<{ invites: import('../types').OneOnOneInvite[] }>(
        '/oneOnOneInvites',
        'list',
        params
      );
    },
    update: async (
      id: string,
      data: Partial<import('../types').OneOnOneInvite>
    ): Promise<ApiResponse<{ invite: import('../types').OneOnOneInvite }>> => {
      return http.put<{ invite: import('../types').OneOnOneInvite }>(
        '/oneOnOneInvites',
        'update',
        {
          id,
          ...data,
        }
      );
    },
  },
  meetings: {
    create: async (
      data: Partial<import('../types').OneOnOneMeeting>
    ): Promise<
      ApiResponse<{ meeting: import('../types').OneOnOneMeeting }>
    > => {
      return http.post<{ meeting: import('../types').OneOnOneMeeting }>(
        '/oneOnOneMeetings',
        'create',
        data
      );
    },
    list: async (): Promise<
      ApiResponse<{ meetings: import('../types').OneOnOneMeeting[] }>
    > => {
      return http.get<{ meetings: import('../types').OneOnOneMeeting[] }>(
        '/oneOnOneMeetings',
        'list'
      );
    },
    update: async (
      id: string,
      data: Partial<import('../types').OneOnOneMeeting>
    ): Promise<
      ApiResponse<{ meeting: import('../types').OneOnOneMeeting }>
    > => {
      return http.put<{ meeting: import('../types').OneOnOneMeeting }>(
        '/oneOnOneMeetings',
        'update',
        {
          id,
          ...data,
        }
      );
    },
  },
};

export default oneOnOneApi;
