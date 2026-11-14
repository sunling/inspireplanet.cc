import { http } from '../config/http';
import { ApiResponse, WritingTemplate } from '../types';

export type WritingTemplateOption = Pick<
  WritingTemplate,
  'id' | 'name' | 'version'
>;

export const writingTemplatesApi = {
  getFilterOptions: () =>
    http.get<{ templates: WritingTemplateOption[] }>(
      '/writingTemplates',
      'getFilterOptions'
    ),
  getAll: (): Promise<ApiResponse<{ templates: WritingTemplate[] }>> =>
    http.get<{ templates: WritingTemplate[] }>('/writingTemplates', 'getAll'),
};

export default writingTemplatesApi;
