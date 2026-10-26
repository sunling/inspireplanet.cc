import { http } from '../config/http';
import { ApiResponse } from '../types/http';

export type CommunityQrGroup = 'community' | 'speakers';

export interface CommunityQrData {
  imageUrl: string | null;
  updatedAt: string | null;
  cleanupComplete?: boolean;
}

export const communityQrApi = {
  current: (
    group: CommunityQrGroup = 'community'
  ): Promise<ApiResponse<CommunityQrData>> =>
    http.get<CommunityQrData>('/communityQr', 'current', { group }),

  update: (
    base64Image: string,
    group: CommunityQrGroup = 'community'
  ): Promise<ApiResponse<CommunityQrData>> =>
    http.post<CommunityQrData>('/communityQr', 'update', {
      base64Image,
      group,
    }),
};

export default communityQrApi;
