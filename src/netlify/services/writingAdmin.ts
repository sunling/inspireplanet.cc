import { http } from '../config/http';
import {
  ApiResponse,
  WritingAdminStats,
  WritingTemplate,
  WritingTopic,
  WritingGroup,
  WritingGroupMember,
} from '../types';

export interface WritingPartnerPairAdmin {
  id: string;
  group_id: string;
  user_a_id: string;
  user_b_id: string;
  assignment_type: 'manual' | 'random';
  created_at: string;
}

export const writingAdminApi = {
  dashboard: (): Promise<
    ApiResponse<{
      stats: WritingAdminStats;
      topics: WritingTopic[];
      templates: WritingTemplate[];
      groups: WritingGroup[];
      members: WritingGroupMember[];
      pairs: WritingPartnerPairAdmin[];
    }>
  > => http.get('/writingAdmin', 'dashboard'),
  saveTopic: (
    topic: Partial<WritingTopic>
  ): Promise<ApiResponse<{ topic: WritingTopic }>> =>
    topic.id
      ? http.put('/writingAdmin', 'saveTopic', topic)
      : http.post('/writingAdmin', 'saveTopic', topic),
  saveTemplate: (
    template: Partial<WritingTemplate>
  ): Promise<ApiResponse<{ template: WritingTemplate }>> =>
    template.id
      ? http.put('/writingAdmin', 'saveTemplate', template)
      : http.post('/writingAdmin', 'saveTemplate', template),
  saveGroup: (
    group: Partial<WritingGroup>
  ): Promise<ApiResponse<{ group: WritingGroup }>> =>
    group.id
      ? http.put('/writingAdmin', 'saveGroup', group)
      : http.post('/writingAdmin', 'saveGroup', group),
  reviewMembership: (
    id: string,
    status: 'approved' | 'rejected'
  ): Promise<ApiResponse<{ message: string }>> =>
    http.put('/writingAdmin', 'reviewMembership', { id, status }),
  assignPartner: (
    group_id: string,
    user_a_id: string,
    user_b_id: string
  ): Promise<ApiResponse<{ message: string }>> =>
    http.post('/writingAdmin', 'assignPartner', {
      group_id,
      user_a_id,
      user_b_id,
    }),
  randomAssignPartners: (
    group_id: string
  ): Promise<ApiResponse<{ message: string; unpaired_user_id?: string }>> =>
    http.post('/writingAdmin', 'randomAssignPartners', { group_id }),
};

export default writingAdminApi;
