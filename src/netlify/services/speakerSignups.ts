import { ApiResponse } from '../types/http';
import { http } from '../config/http';
import { SpeakerSignup } from '../functions/speakerSignups';

export const speakerSignupsApi = {
  getByEpisode: async (
    meetup_id: number,
    episode_number: number
  ): Promise<ApiResponse<{ signups: SpeakerSignup[] }>> => {
    return http.get('/speakerSignups', 'getByEpisode', {
      meetup_id,
      episode_number,
    });
  },

  create: async (
    data: Pick<
      SpeakerSignup,
      'meetup_id' | 'episode_number' | 'name' | 'topic' | 'duration'
    >
  ): Promise<ApiResponse<{ signup: SpeakerSignup }>> => {
    return http.post('/speakerSignups', 'create', data);
  },

  updateStatus: async (
    id: number,
    status: 'confirmed' | 'cancelled'
  ): Promise<ApiResponse<{ signup: SpeakerSignup }>> => {
    return http.post('/speakerSignups', 'updateStatus', { id, status });
  },
};

export default speakerSignupsApi;
