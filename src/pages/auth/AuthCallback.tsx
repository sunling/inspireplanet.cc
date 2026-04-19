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

      const email = session.user.email!;
      const token = session.access_token;

      // Fetch or create profile in users table
      let profile: UserInfo | null = null;
      const res = await http.post<{ user: UserInfo }>('/auth', 'getProfile', { email });
      if (res.success && res.data?.user) {
        profile = res.data.user;
      } else {
        // First Google login — create profile
        const name =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          email.split('@')[0];
        const createRes = await http.post<{ user: UserInfo }>('/auth', 'register', { email, name });
        if (createRes.success && createRes.data?.user) {
          profile = createRes.data.user;
        }
      }

      setUserAuth(token, profile || { email });
      navigate('/cards', { replace: true });
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
