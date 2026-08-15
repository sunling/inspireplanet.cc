import { ApiResponse } from '../types/http';
import { http } from '../config/http';
import { EpisodeCardContext, MeetupEpisode } from '../functions/episodes';

export const episodesApi = {
  getById: async (
    id: number
  ): Promise<ApiResponse<{ episode: EpisodeCardContext }>> => {
    return http.get('/episodes', 'getById', { id });
  },

  getByMeetupEpisode: async (
    meetup_id: number,
    episode_number: number
  ): Promise<ApiResponse<{ episode: EpisodeCardContext }>> => {
    return http.get('/episodes', 'getByMeetupEpisode', {
      meetup_id,
      episode_number,
    });
  },

  getByMeetupDate: async (
    meetup_id: number,
    date: string
  ): Promise<ApiResponse<{ episode: MeetupEpisode | null }>> => {
    return http.get('/episodes', 'getByMeetupDate', { meetup_id, date });
  },

  upsert: async (
    data: Pick<
      MeetupEpisode,
      'meetup_id' | 'episode_number' | 'date' | 'theme' | 'description'
    >
  ): Promise<ApiResponse<{ episode: MeetupEpisode }>> => {
    return http.post('/episodes', 'upsert', data);
  },
};

export default episodesApi;
