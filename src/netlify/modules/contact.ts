import { ApiResponse } from '../types/http';
import { http } from '../config/http';

export const contactApi = {
  sendEmail: async (data: {
    name: string;
    email: string;
    message: string;
  }): Promise<ApiResponse<{ success: boolean }>> => {
    return http.post<{ success: boolean }>('/sendEmail', data);
  },
};

export default contactApi;
