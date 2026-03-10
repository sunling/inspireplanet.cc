import { ApiResponse } from '../types/http';
import { Workshop } from '../types';
import { http } from '../config/http';

export const workshopApi = {
  register: async (
    registrationData: Partial<Workshop>
  ): Promise<ApiResponse<{ success: boolean }>> => {
    return http.post<{ success: boolean }>('/workshop', registrationData);
  },
};

export default workshopApi;
