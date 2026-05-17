import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Slide,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import CloseIcon from '@mui/icons-material/Close';
import AddToHomeScreenIcon from '@mui/icons-material/AddToHomeScreen';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 检查是否是iOS设备
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // 检查是否已经以standalone模式运行
    const isInStandaloneMode = window.matchMedia(
      '(display-mode: standalone)'
    ).matches;
    setIsStandalone(isInStandaloneMode);

    // 监听beforeinstallprompt事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // 延迟显示提示，避免在页面加载时立即显示
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 检查是否已经显示过提示
    const hasShownPrompt = localStorage.getItem('pwa-prompt-shown');
    if (!hasShownPrompt && !isInStandaloneMode) {
      // 对于iOS设备，延迟显示提示
      if (isIOSDevice) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      }
    }

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
      localStorage.setItem('pwa-prompt-shown', 'true');
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-shown', 'true');
  };

  if (isStandalone) {
    return null;
  }

  return (
    <Dialog
      open={showPrompt}
      onClose={handleClose}
      TransitionComponent={Transition}
      keepMounted
      aria-describedby="pwa-install-dialog-description"
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddToHomeScreenIcon color="primary" />
          <Typography variant="h6">安装启发星球</Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography id="pwa-install-dialog-description" sx={{ mb: 2 }}>
          将启发星球添加到主屏幕，获得更好的使用体验！
        </Typography>

        {isIOS ? (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              iOS设备安装步骤：
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              1. 点击浏览器底部的"分享"按钮
              <br />
              2. 在弹出菜单中选择"添加到主屏幕"
              <br />
              3. 点击"添加"完成安装
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            点击下方按钮，即可将应用安装到您的设备上。
          </Typography>
        )}
      </DialogContent>

      {!isIOS && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} color="inherit">
            暂不安装
          </Button>
          <Button
            onClick={handleInstallClick}
            variant="contained"
            color="primary"
          >
            立即安装
          </Button>
        </DialogActions>
      )}

      {isIOS && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleClose}
            variant="contained"
            color="primary"
            fullWidth
          >
            我知道了
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default PWAInstallPrompt;
