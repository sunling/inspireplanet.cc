export type CardImageUploader = (
  base64Image: string,
  purpose: 'card'
) => Promise<{
  success: boolean;
  data?: { url?: string };
  error?: string;
}>;

export async function uploadCardImage(
  base64Image?: string,
  isPrivate = false,
  uploader?: CardImageUploader
): Promise<string> {
  if (!base64Image) return '';
  if (isPrivate) {
    throw new Error('私密卡片暂不支持本地图片，因为图片仓库是公开的');
  }
  if (!uploader) throw new Error('图片上传服务未配置');

  const response = await uploader(base64Image, 'card');
  const url = response.data?.url;

  if (!response.success || !url) {
    throw new Error(response.error || '图片上传失败，请稍后重试');
  }

  return url;
}
