import { http } from '../config/http';

interface BatchConfirmParams {
  meetup_id: number;
  rsvp_ids: number[];
  send_email?: boolean;
  approved_by?: string;
}

interface GetParticipantsParams {
  meetup_id: number;
}

export interface Participant {
  id: string;
  name: string;
  email: string | null;
  status: string;
  created_at: string;
  question_answer: string | null;
}

const participantsApi = {
  getParticipants: async (params: GetParticipantsParams) => {
    return await http.post('/participants', 'get', params);
  },

  batchConfirm: async (params: BatchConfirmParams) => {
    return await http.post('/participants', 'batch_confirm', params);
  },

  batchReject: async (params: { meetup_id: number; rsvp_ids: number[] }) => {
    return await http.post('/participants', 'batch_reject', params);
  },
};

export default participantsApi;
