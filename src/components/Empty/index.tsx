import React from 'react';
import styles from './index.module.css';

interface EmptyProps {
  message?: string;
  description?: string;
}

const Empty: React.FC<EmptyProps> = ({
  message = '暂无数据',
  description = '暂无相关内容',
}) => {
  return (
    <div className={styles['empty-container']}>
      <h2 className={styles['empty-message']}>{message}</h2>
      <p className={styles['empty-description']}>{description}</p>
    </div>
  );
};

export default Empty;
