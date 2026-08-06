import { describe, expect, it, vi } from 'vitest';
import { uploadCardImage } from './uploadCardImage';

describe('uploadCardImage', () => {
  it('skips the upload when no local image was selected', async () => {
    const uploader = vi.fn();

    await expect(uploadCardImage(undefined, false, uploader)).resolves.toBe('');
    expect(uploader).not.toHaveBeenCalled();
  });

  it('uploads card images to the card folder and returns the GitHub URL', async () => {
    const uploader = vi.fn().mockResolvedValue({
      success: true,
      data: {
        url: 'https://raw.githubusercontent.com/sunling/inspireplanet-assets/main/user_uploads/card/card.png',
      },
    });

    await expect(
      uploadCardImage('data:image/png;base64,ZmFrZQ==', false, uploader)
    ).resolves.toContain('sunling/inspireplanet-assets');
    expect(uploader).toHaveBeenCalledWith(
      'data:image/png;base64,ZmFrZQ==',
      'card'
    );
  });

  it('prevents card creation when the image upload fails', async () => {
    const uploader = vi.fn().mockResolvedValue({
      success: false,
      error: 'GitHub upload failed',
    });

    await expect(
      uploadCardImage('data:image/png;base64,ZmFrZQ==', false, uploader)
    ).rejects.toThrow('GitHub upload failed');
  });

  it('rejects a successful response without an image URL', async () => {
    const uploader = vi.fn().mockResolvedValue({ success: true, data: {} });

    await expect(
      uploadCardImage('data:image/png;base64,ZmFrZQ==', false, uploader)
    ).rejects.toThrow('图片上传失败，请稍后重试');
  });

  it('does not publish a private card image to the public asset repo', async () => {
    const uploader = vi.fn();

    await expect(
      uploadCardImage('data:image/png;base64,ZmFrZQ==', true, uploader)
    ).rejects.toThrow('图片仓库是公开的');
    expect(uploader).not.toHaveBeenCalled();
  });
});
