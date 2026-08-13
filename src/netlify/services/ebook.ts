import { http } from '../config/http';
import { ApiResponse } from '../types/http';
import { PersonalEbook } from '../types/ebook';

export const ebookApi = {
  getMine: (): Promise<ApiResponse<PersonalEbook>> =>
    http.get<PersonalEbook>('/personalEbook', 'getMine'),
};

export default ebookApi;
