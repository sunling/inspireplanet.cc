import { ApiResponse } from '../types/http';
import { http } from '../config/http';

export const peopleApi = {
  list: async (params?: {
    q?: string;
    offering?: string;
    seeking?: string;
    interest?: string;
    expertise?: string;
    theme?: string;
  }): Promise<ApiResponse<{ users: import('../types').PeopleUser[] }>> => {
    return http.get<{ users: import('../types').PeopleUser[] }>(
      '/users',
      'list',
      params as any
    );
  },
  getById: async (
    id: string | number
  ): Promise<ApiResponse<{ users: import('../types').PeopleUser[] }>> => {
    return http.get<{ users: import('../types').PeopleUser[] }>(
      '/users',
      'getById',
      {
        id,
      } as any
    );
  },
  getByIds: async (
    ids: Array<string | number>
  ): Promise<ApiResponse<{ users: import('../types').PeopleUser[] }>> => {
    return http.get<{ users: import('../types').PeopleUser[] }>(
      '/users',
      'getByIds',
      {
        ids: ids.map(String).join(','),
      } as any
    );
  },
};

export default peopleApi;
