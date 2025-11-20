import React from 'react';
import { CircularProgress } from '@mui/material';
import styles from './index.module.css';

interface LoadingProps {
  message?: string;
  size?: number;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

const Loading: React.FC<LoadingProps> = ({
  message = '加载中...',
  size = 16,
  color = 'primary',
}) => {
  return (
    <div className={styles['loading-container']}>
      <CircularProgress
        size={size}
        color={color}
        className={styles['loading-spinner']}
        aria-label={message}
      />
      {message && <p className={styles['loading-message']}>{message}</p>}
    </div>
  );
};

export default Loading;
