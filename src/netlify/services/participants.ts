import { http } from '../config/http';

interface BatchConfirmParams {
  meetup_id: number;
  rsvp_ids: number[];
  send_email?: boolean;
  approved_by?: string;
}

interface GetParticipantsParams {
  meetup_id: number;
  page?: number;
  limit?: number;
  stats_only?: boolean;
}

export interface ParticipantWritingGroup {
  id: string;
  name: string;
  description?: string | null;
}

export interface AddToWritingGroupResult {
  message: string;
  added_count: number;
  existing_count: number;
  skipped_count: number;
}

export interface Participant {
  id: string;
  name: string;
  status: string;
  created_at: string;
  question_answer: string | null;
}

const participantsApi = {
  getParticipants: async (params: GetParticipantsParams) => {
    return await http.post('/participants', 'getParticipants', params);
  },

  batchConfirm: async (params: BatchConfirmParams) => {
    return await http.post('/participants', 'batchConfirm', params);
  },

  batchReject: async (params: {
    meetup_id: number;
    rsvp_ids: number[];
    send_email?: boolean;
    approved_by?: string;
  }) => {
    return await http.post('/participants', 'batchReject', params);
  },

  getWritingGroups: async () => {
    return await http.get<{ groups: ParticipantWritingGroup[] }>(
      '/participants',
      'getWritingGroups'
    );
  },

  addToWritingGroup: async (meetup_id: number, group_id: number) => {
    return await http.post<AddToWritingGroupResult>(
      '/participants',
      'addToWritingGroup',
      { meetup_id, group_id }
    );
  },
};

export default participantsApi;
