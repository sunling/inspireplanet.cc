import { NetlifyEvent, NetlifyResponse } from '../types/http';
import {
  createSuccessResponse,
  createErrorResponse,
  handleOptionsRequest,
  getFuntionNameFromEvent,
  getDataFromEvent,
} from '../utils/server';

export interface ImageUploadRequest {
  base64Image: string;
}

export interface ImageUploadResponse {
  success: boolean;
  url?: string;
  error?: string;
  message?: string;
  details?: any;
}

interface GitHubResponse {
  content?: {
    path: string;
  };
  message?: string;
}

export interface UploadImageAction {
  functionName: 'upload';
}

export async function handler(
  event: NetlifyEvent,
  context: any
): Promise<NetlifyResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptionsRequest();
  }

  try {
    const functionName = getFuntionNameFromEvent(event);

    switch (functionName) {
      case 'upload':
        return await handleUpload(event);
      default:
        return createErrorResponse('无效的操作类型');
    }
  } catch (error) {
    console.error('UploadImage handler error:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

async function handleUpload(event: NetlifyEvent): Promise<NetlifyResponse> {
  try {
    const requestBody = getDataFromEvent(event) as ImageUploadRequest;
    const base64Image: string = requestBody.base64Image;

    if (!base64Image) {
      return createErrorResponse('缺少base64Image参数');
    }

    const base64Data: string = base64Image.split(',')[1];
    if (!base64Data) {
      return createErrorResponse('无效的base64图片格式');
    }

    const GITHUB_TOKEN: string = process.env.GITHUB_TOKEN as string;
    const GITHUB_REPO_OWNER: string = process.env.GITHUB_REPO_OWNER as string;
    const GITHUB_REPO_NAME: string = process.env.GITHUB_REPO_NAME as string;
    const GITHUB_BRANCH: string = process.env.GITHUB_BRANCH as string;

    if (
      !GITHUB_TOKEN ||
      !GITHUB_REPO_OWNER ||
      !GITHUB_REPO_NAME ||
      !GITHUB_BRANCH
    ) {
      console.error('Missing GitHub environment variables');
      return createErrorResponse('服务器配置错误', 500);
    }

    const timestamp: number = Date.now();
    const randomString: string = Math.random().toString(36).substring(2, 8);
    const filename: string = `user_uploads/image_${timestamp}_${randomString}.png`;

    const url: string = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${filename}`;

    const response: Response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `Upload image: ${filename}`,
        content: base64Data,
        branch: GITHUB_BRANCH,
      }),
    });

    const data: GitHubResponse = await response.json();

    if (response.ok && data.content && data.content.path) {
      const rawUrl: string = `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${GITHUB_BRANCH}/${data.content.path}`;

      return createSuccessResponse({ url: rawUrl });
    } else {
      console.error('❌ Image upload failed:', data);
      return createErrorResponse(
        data.message || '上传图片到GitHub失败',
        response.status || 500
      );
    }
  } catch (error: any) {
    console.error('❌ Error in uploadImageToGitHub function:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}
