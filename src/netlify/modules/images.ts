import { ApiResponse } from '../types/http';
import { SearchImageItem } from '../types';
import { http } from '../config/http';

export const imagesApi = {
  upload: async (
    base64Image: string
  ): Promise<ApiResponse<{ url: string }>> => {
    return http.post<{ url: string }>('/uploadImage', {
      base64Image,
    });
  },

  search: async (
    text: string,
    orientation?: string
  ): Promise<ApiResponse<{ query: string; images: SearchImageItem[] }>> => {
    return http.post<{ query: string; images: SearchImageItem[] }>(
      '/searchImage',
      {
        text,
        orientation,
      }
    );
  },
};

export default imagesApi;
