import React from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home } from '@mui/icons-material';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMedium = useMediaQuery(theme.breakpoints.down('md'));

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
        padding: { xs: 2, sm: 4 },
        textAlign: 'center',
      }}
    >
      {/* 404 数字显示 */}
      <Typography
        variant="h1"
        component="h1"
        sx={{
          fontWeight: 700,
          fontSize: {
            xs: '8rem',
            sm: '10rem',
            md: '12rem',
            lg: '14rem',
          },
          lineHeight: 1,
          marginBottom: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: {
            xs: '2px 2px 4px rgba(0,0,0,0.1)',
            sm: '3px 3px 6px rgba(0,0,0,0.1)',
          },
        }}
      >
        404
      </Typography>

      {/* 错误消息 */}
      <Box sx={{ maxWidth: 500, mb: 6 }}>
        <Typography
          variant="h4"
          component="h2"
          sx={{
            fontWeight: 600,
            marginBottom: 2,
            color: theme.palette.text.primary,
          }}
        >
          页面未找到
        </Typography>

        <Typography
          variant="body1"
          sx={{
            fontSize: { xs: '1rem', sm: '1.125rem' },
            lineHeight: 1.6,
            color: theme.palette.text.secondary,
            marginBottom: 4,
          }}
        >
          抱歉，您请求的页面不存在或已被移除。请检查URL是否正确，或返回首页继续浏览。
        </Typography>

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
      </Box>

      {/* 装饰元素 - 可选 */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: { xs: 80, sm: 120, md: 160 },
          height: { xs: 80, sm: 120, md: 160 },
          borderRadius: '50%',
          background: 'rgba(102, 126, 234, 0.08)',
          display: { xs: 'none', sm: 'block' },
          animation: 'float 6s ease-in-out infinite',
          '@keyframes float': {
            '0%': { transform: 'translate(0, 0px)' },
            '50%': { transform: 'translate(0, -20px)' },
            '100%': { transform: 'translate(0, 0px)' },
          },
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          right: '10%',
          width: { xs: 60, sm: 100, md: 140 },
          height: { xs: 60, sm: 100, md: 140 },
          borderRadius: '50%',
          background: 'rgba(118, 75, 162, 0.08)',
          display: { xs: 'none', sm: 'block' },
          animation: 'float 7s ease-in-out infinite 1s',
          '@keyframes float': {
            '0%': { transform: 'translate(0, 0px)' },
            '50%': { transform: 'translate(0, -20px)' },
            '100%': { transform: 'translate(0, 0px)' },
          },
        }}
      />
    </Container>
  );
};

export default NotFound;
