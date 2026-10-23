import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { supabaseAuth } from '../../database/supabaseAuth';
import { http } from '../../netlify/config/http';
import { setUserAuth } from '../../utils/user';
import { UserInfo } from '../../netlify/types';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      // Exchange the OAuth code for a session (PKCE flow)
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error: exchangeError } = await supabaseAuth.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('Code exchange error:', exchangeError);
          setError('登录失败：' + exchangeError.message);
          setTimeout(() => navigate('/login'), 2000);
          return;
        }
      }

      const { data: { session }, error: sessionError } = await supabaseAuth.auth.getSession();

      if (sessionError || !session) {
        setError('登录失败，请重试');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      const token = session.access_token;
      // getProfile provisions a missing profile from the verified server identity.
      const res = await http.post<{ user: UserInfo }>('/auth', 'getProfile', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.success || !res.data?.user) {
        setError('读取用户资料失败，请重试登录');
        return;
      }
      setUserAuth(token, res.data.user);
      
      // 获取之前保存的重定向URL，默认跳转到/cards
      const redirectUrl = localStorage.getItem('redirectAfterLogin') || '/cards';
      localStorage.removeItem('redirectAfterLogin');
      navigate(redirectUrl, { replace: true });
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: 2 }}>
      <CircularProgress />
      <Typography color="text.secondary">正在登录...</Typography>
    </Box>
  );
};

export default AuthCallback;
