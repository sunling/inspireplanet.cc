import React from 'react';
import { Container, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home } from '@mui/icons-material';
import useResponsive from '@/hooks/useResponsive';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile, isMedium } = useResponsive();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <Container
      maxWidth="lg"
      sx={{
        minHeight: 'calc(100vh - 200px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {/* 404 数字显示 */}
      <h1
        style={{
          fontWeight: 700,
          fontSize: isMobile ? '8rem' : isMedium ? '10rem' : '14rem',
          lineHeight: 1,
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '3px 3px 6px rgba(0,0,0,0.1)',
        }}
      >
        404
      </h1>

      {/* 错误消息 */}
      <div style={{ maxWidth: 500, marginBottom: '2rem' }}>
        <h2
          style={{
            fontWeight: 600,
            marginBottom: '1rem',
            color: 'rgba(0, 0, 0, 0.87)',
            fontSize: '1.5rem',
          }}
        >
          页面未找到
        </h2>

        <p
          style={{
            fontSize: isMobile ? '1rem' : '1.125rem',
            lineHeight: 1.6,
            color: 'rgba(0, 0, 0, 0.6)',
            marginBottom: '1.5rem',
          }}
        >
          抱歉，您请求的页面不存在或已被移除。请检查URL是否正确，或返回首页继续浏览。
        </p>

        {/* 返回首页按钮 */}
        <Button
          variant="contained"
          size={isMobile ? 'small' : 'large'}
          startIcon={<Home />}
          onClick={handleGoHome}
          sx={{
            padding: { xs: '8px 16px', sm: '10px 24px' },
            borderRadius: 2,
            fontSize: { xs: '0.875rem', sm: '1rem' },
            textTransform: 'none',
            fontWeight: 500,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          返回首页
        </Button>
      </div>
    </Container>
  );
};

export default NotFound;
