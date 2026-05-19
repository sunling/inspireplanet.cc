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
};

export default participantsApi;
