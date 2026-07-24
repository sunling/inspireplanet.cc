import { http } from '../config/http';
import { ApiResponse, WritingGroup, WritingPartner } from '../types';

export const writingGroupsApi = {
  list: (): Promise<ApiResponse<{ groups: WritingGroup[] }>> =>
    http.get('/writingGroups', 'list'),
  apply: (group_id: string): Promise<ApiResponse<{ message: string }>> =>
    http.post('/writingGroups', 'apply', { group_id }),
  myPartners: (): Promise<ApiResponse<{ partners: WritingPartner[] }>> =>
    http.get('/writingGroups', 'myPartners'),
};

export default writingGroupsApi;
