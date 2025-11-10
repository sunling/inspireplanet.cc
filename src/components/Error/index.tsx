import React from 'react';
import { Button } from '@mui/material';
import styles from './index.module.css';

interface ErrorProps {
  message?: string;
  description?: string;
  onRetry?: () => void;
  retryText?: string;
}

const Error: React.FC<ErrorProps> = ({
  message = '加载失败',
  description = '数据加载出现错误',
  onRetry,
  retryText = '重试',
}) => {
  return (
    <div className={styles['error-container']}>
      <h2 className={styles['error-message']}>{message}</h2>
      {description && (
        <p className={styles['error-description']}>{description}</p>
      )}
      {onRetry && (
        <Button
          variant="contained"
          onClick={onRetry}
          className={styles['retry-button']}
        >
          {retryText}
        </Button>
      )}
    </div>
  );
};

export default Error;
