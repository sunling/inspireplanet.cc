import { http } from '../config/http';
import { ApiResponse } from '../types/http';
import { EpisodeResponse } from '../functions/episodeResponses';

export const episodeResponsesApi = {
  getByEpisode: async (
    meetupId: number,
    episodeNumber: number
  ): Promise<ApiResponse<{ responses: EpisodeResponse[] }>> =>
    http.get('/episodeResponses', 'getByEpisode', {
      meetup_id: meetupId,
      episode_number: episodeNumber,
    }),

  create: async (data: {
    meetup_id: number;
    episode_number: number;
    content: string;
    author: string;
    publish_consent: boolean;
    website?: string;
  }): Promise<ApiResponse<{ response: EpisodeResponse | null }>> =>
    http.post('/episodeResponses', 'create', data),
};

export default episodeResponsesApi;
