import React, { useState, useCallback } from 'react';
import { Alert, AlertColor, Snackbar } from '@mui/material';

const DURATION = 3000;

// 定义消息配置接口
export interface SnackbarMessageOptions {
  message: string;
  severity?: AlertColor;
  duration?: number;
  verticalPosition?: 'top' | 'bottom';
  horizontalPosition?: 'left' | 'center' | 'right';
  onClose?: () => void;
}

// 增强的showSnackbar接口
export interface EnhancedShowSnackbar {
  (options: string | SnackbarMessageOptions): void;
  // 便捷方法
  info: (
    message: string,
    options?: Omit<SnackbarMessageOptions, 'message' | 'severity'>
  ) => void;
  success: (
    message: string,
    options?: Omit<SnackbarMessageOptions, 'message' | 'severity'>
  ) => void;
  error: (
    message: string,
    options?: Omit<SnackbarMessageOptions, 'message' | 'severity'>
  ) => void;
  warning: (
    message: string,
    options?: Omit<SnackbarMessageOptions, 'message' | 'severity'>
  ) => void;
}

// 定义钩子返回值接口
export interface UseSnackbarReturn {
  showSnackbar: EnhancedShowSnackbar;
  hideSnackbar: () => void;
  SnackbarComponent: React.FC;
}

/**
 * 自定义Snackbar钩子，用于显示操作通知
 * @returns 包含显示、隐藏方法和Snackbar组件的对象
 */
const useSnackbar = (): UseSnackbarReturn => {
  // 状态管理
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('info');
  const [duration, setDuration] = useState(DURATION);
  const [verticalPosition, setVerticalPosition] = useState<'top' | 'bottom'>(
    'top'
  );
  const [horizontalPosition, setHorizontalPosition] = useState<
    'left' | 'center' | 'right'
  >('center');
  const [onCloseCallback, setOnCloseCallback] = useState<
    (() => void) | undefined
  >(undefined);

  // 基础显示方法
  const baseShowSnackbar = useCallback(
    (options: string | SnackbarMessageOptions) => {
      try {
        // 处理字符串和对象两种调用方式
        if (typeof options === 'string') {
          setMessage(options);
          setSeverity('info');
          setDuration(DURATION);
        } else {
          setMessage(options.message);
          setSeverity(options.severity || 'info');
          setDuration(options.duration || DURATION);
          setVerticalPosition(options.verticalPosition || 'top');
          setHorizontalPosition(options.horizontalPosition || 'center');
          setOnCloseCallback(options.onClose);
        }
        setOpen(true);
      } catch (error) {
        console.error('Error showing snackbar:', error);
      }
    },
    []
  );

  // 创建增强版的showSnackbar函数
  const showSnackbar = useCallback(
    (() => {
      // 创建基础函数
      const enhancedShowSnackbar: EnhancedShowSnackbar = (options) =>
        baseShowSnackbar(options);

      // 添加便捷方法
      enhancedShowSnackbar.info = (message, options = {}) => {
        baseShowSnackbar({ message, severity: 'info', ...options });
      };

      enhancedShowSnackbar.success = (message, options = {}) => {
        baseShowSnackbar({ message, severity: 'success', ...options });
      };

      enhancedShowSnackbar.error = (message, options = {}) => {
        baseShowSnackbar({ message, severity: 'error', ...options });
      };

      enhancedShowSnackbar.warning = (message, options = {}) => {
        baseShowSnackbar({ message, severity: 'warning', ...options });
      };

      return enhancedShowSnackbar;
    })(),
    [baseShowSnackbar]
  );

  // 隐藏Snackbar
  const hideSnackbar = useCallback(() => {
    setOpen(false);
  }, []);

  // 处理关闭事件
  const handleClose = useCallback(
    (event?: React.SyntheticEvent, reason?: string) => {
      // 防止用户在消息显示期间点击屏幕时关闭
      if (reason === 'clickaway') {
        return;
      }
      setOpen(false);
      // 执行自定义的关闭回调
      if (onCloseCallback) {
        try {
          onCloseCallback();
        } catch (error) {
          console.error('Error in snackbar onClose callback:', error);
        }
      }
    },
    [onCloseCallback]
  );

  // Snackbar组件
  const SnackbarComponent: React.FC = () => {
    return (
      <Snackbar
        open={open}
        autoHideDuration={duration}
        onClose={() => handleClose()}
        anchorOrigin={{
          vertical: verticalPosition,
          horizontal: horizontalPosition,
        }}
      >
        <Alert
          onClose={handleClose}
          severity={severity}
          variant="filled"
          sx={{
            width: '100%',
            borderRadius: '8px',
            boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
          }}
        >
          {message}
        </Alert>
      </Snackbar>
    );
  };

  return {
    showSnackbar,
    hideSnackbar,
    SnackbarComponent,
  };
};

export default useSnackbar;
