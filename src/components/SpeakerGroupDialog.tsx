import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import communityQrApi, {
  type CommunityQrData,
} from '../netlify/services/communityQr';

const SpeakerGroupDialog: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const [qr, setQr] = useState<CommunityQrData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let active = true;
    setQr(null);
    setLoading(true);
    setError('');
    communityQrApi
      .current('speakers')
      .then((response) => {
        if (!response.success) throw new Error(response.error || '读取失败');
        if (active) setQr(response.data || null);
      })
      .catch(() => {
        if (active)
          setError('二维码暂时无法加载，请联系活动组织者获取分享者群。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="speaker-group-title"
    >
      <DialogTitle id="speaker-group-title">分享申请已提交</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          欢迎加入分享者群，和组织者沟通分享安排，也和其他分享者交流。具体分享时间由组织者确认。
        </Typography>
        <Box aria-live="polite" sx={{ textAlign: 'center' }}>
          {loading && (
            <CircularProgress size={28} aria-label="正在加载分享者群二维码" />
          )}
          {!loading && error && (
            <Typography variant="body2" color="text.secondary">
              {error}
            </Typography>
          )}
          {!loading && !error && qr?.imageUrl && (
            <>
              <Box
                component="img"
                src={qr.imageUrl}
                alt="启发星球分享者群二维码"
                onError={() =>
                  setError(
                    '二维码图片暂时无法加载，请联系活动组织者获取分享者群。'
                  )
                }
                sx={{
                  display: 'block',
                  width: '100%',
                  maxWidth: 280,
                  maxHeight: 360,
                  objectFit: 'contain',
                  mx: 'auto',
                }}
              />
              <Typography variant="body2" sx={{ mt: 1 }}>
                用微信扫码，或保存图片后在微信中识别。
              </Typography>
              {qr.updatedAt && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1 }}
                >
                  二维码更新于{' '}
                  {new Date(qr.updatedAt).toLocaleDateString('zh-CN')}
                </Typography>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.5 }}
              >
                若二维码已过期，请联系活动组织者更新。
              </Typography>
            </>
          )}
          {!loading && !error && !qr?.imageUrl && (
            <Typography variant="body2" color="text.secondary">
              分享者群二维码正在准备中，请联系活动组织者加入。你的分享申请已保存。
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>完成</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SpeakerGroupDialog;
