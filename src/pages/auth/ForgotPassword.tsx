import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  CircularProgress,
} from '@mui/material';
import { supabaseAuth } from '../../database/supabaseAuth';
import { setUserAuth } from '../../utils/user';
import { http } from '../../netlify/config/http';
import { UserInfo } from '../../netlify/types';

type Step = 'email' | 'otp' | 'password';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setError('请输入邮箱地址');
      return;
    }
    setLoading(true);
    setError('');
    const { error: err } = await supabaseAuth.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (err) {
      console.error('[forgot-password] send otp failed:', err);
      const message = err.message.toLowerCase();
      setError(message.includes('not found') || message.includes('no user')
        ? '该邮箱未注册'
        : message.includes('email not confirmed')
          ? '邮箱还未验证，请先打开注册邮件完成确认后再登录'
          : '发送失败，请稍后重试');
      return;
    }
    setStep('otp');
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError('请输入验证码');
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: err } = await supabaseAuth.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'email',
    });
    setLoading(false);
    if (err || !data.session) {
      setError('验证码错误或已过期');
      return;
    }
    // 验证成功后取 profile 存入 localStorage，后续 updateUser 需要已登录
    const token = data.session.access_token;
    try {
      const res = await http.post<{ user: UserInfo }>('/auth', 'getProfile', { email: email.trim() });
      const user: UserInfo = res.data?.user || { email: email.trim(), name: '' };
      setUserAuth(token, user);
    } catch {
      setUserAuth(token, { email: email.trim(), name: '' });
    }
    setStep('password');
  };

  const handleSetPassword = async () => {
    if (!newPassword) {
      setError('请输入新密码');
      return;
    }
    if (newPassword.length < 6) {
      setError('密码长度至少为 6 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }
    setLoading(true);
    setError('');
    const { error: err } = await supabaseAuth.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (err) {
      setError('设置密码失败：' + err.message);
      return;
    }
    setSuccess('密码重置成功，即将跳转到登录页...');
    setTimeout(() => navigate('/login'), 1500);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', bgcolor: '#f5f5f5' }}>
      <Container maxWidth="xs">
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h5" fontWeight={600} textAlign="center" mb={1}>
            忘记密码
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
            {step === 'email' && '输入注册邮箱，我们将发送验证码'}
            {step === 'otp' && `验证码已发送至 ${email}`}
            {step === 'password' && '验证成功，请设置新密码'}
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          {step === 'email' && (
            <>
              <TextField
                fullWidth
                label="邮箱"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                sx={{ mb: 3 }}
              />
              <Button
                fullWidth
                variant="contained"
                onClick={handleSendOtp}
                disabled={loading}
                sx={{ py: 1.5 }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : '发送验证码'}
              </Button>
            </>
          )}

          {step === 'otp' && (
            <>
              <TextField
                fullWidth
                label="验证码"
                value={otp}
                onChange={(e) => { setOtp(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                inputProps={{ maxLength: 6 }}
                sx={{ mb: 1 }}
              />
              <Button
                variant="text"
                size="small"
                onClick={() => { setStep('email'); setOtp(''); setError(''); }}
                sx={{ mb: 2, color: 'text.secondary' }}
              >
                重新发送
              </Button>
              <Button
                fullWidth
                variant="contained"
                onClick={handleVerifyOtp}
                disabled={loading}
                sx={{ py: 1.5 }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : '验证'}
              </Button>
            </>
          )}

          {step === 'password' && (
            <>
              <TextField
                fullWidth
                label="新密码"
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="确认新密码"
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
                sx={{ mb: 3 }}
              />
              <Button
                fullWidth
                variant="contained"
                onClick={handleSetPassword}
                disabled={loading}
                sx={{ py: 1.5 }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : '设置新密码'}
              </Button>
            </>
          )}

          <Button
            fullWidth
            variant="text"
            onClick={() => navigate('/login')}
            sx={{ mt: 2, color: 'text.secondary' }}
          >
            返回登录
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default ForgotPassword;
