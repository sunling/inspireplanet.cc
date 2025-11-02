// src/netlify/functions/uploadImageToGitHub.ts

// Node.js 18+原生支持fetch，无需额外导入

// 定义请求体接口
export interface ImageUploadRequest {
  base64Image: string;
}

// 定义响应接口
export interface ImageUploadResponse {
  success: boolean;
  url?: string;
  error?: string;
  message?: string;
  details?: any;
}

// 定义Netlify函数事件接口
interface NetlifyEvent {
  httpMethod: string;
  body: string;
}

// 定义Netlify函数上下文接口
interface NetlifyContext {
  clientContext?: any;
}

// 定义GitHub API响应接口
interface GitHubResponse {
  content?: {
    path: string;
  };
  message?: string;
}

exports.handler = async (
  event: NetlifyEvent,
  context: NetlifyContext
): Promise<{ statusCode: number; body: string }> => {
  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({
          success: false,
          error: 'Method Not Allowed',
        } as ImageUploadResponse),
      };
    }

    // Parse the request body
    const requestBody: ImageUploadRequest = JSON.parse(event.body);
    const base64Image: string = requestBody.base64Image;

    // Validate the input
    if (!base64Image) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Missing base64Image in request body',
        } as ImageUploadResponse),
      };
    }

    // Extract the base64 data part (remove the prefix like "data:image/png;base64,")
    const base64Data: string = base64Image.split(',')[1];
    if (!base64Data) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Invalid base64 image format',
        } as ImageUploadResponse),
      };
    }

    // Get GitHub configuration from environment variables
    const GITHUB_TOKEN: string = process.env.GITHUB_TOKEN as string;
    const GITHUB_REPO_OWNER: string = process.env.GITHUB_REPO_OWNER as string;
    const GITHUB_REPO_NAME: string = process.env.GITHUB_REPO_NAME as string;
    const GITHUB_BRANCH: string = process.env.GITHUB_BRANCH as string;

    // Validate environment variables
    if (
      !GITHUB_TOKEN ||
      !GITHUB_REPO_OWNER ||
      !GITHUB_REPO_NAME ||
      !GITHUB_BRANCH
    ) {
      console.error('Missing GitHub environment variables');
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Server configuration error',
        } as ImageUploadResponse),
      };
    }

    // Generate a unique filename
    const timestamp: number = Date.now();
    const randomString: string = Math.random().toString(36).substring(2, 8);
    const filename: string = `user_uploads/image_${timestamp}_${randomString}.png`;

    // Prepare the GitHub API request
    const url: string = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${filename}`;

    // 使用Node.js原生fetch API调用GitHub API
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
      // Construct the raw.githubusercontent.com link
      const rawUrl: string = `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${GITHUB_BRANCH}/${data.content.path}`;

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          url: rawUrl,
        } as ImageUploadResponse),
      };
    } else {
      console.error('❌ Image upload failed:', data);
      return {
        statusCode: response.status || 500,
        body: JSON.stringify({
          success: false,
          error: data.message || 'Failed to upload image to GitHub',
          details: data,
        } as ImageUploadResponse),
      };
    }
  } catch (error: any) {
    console.error('❌ Error in uploadImageToGitHub function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        message: error.message,
      } as ImageUploadResponse),
    };
  }
};
