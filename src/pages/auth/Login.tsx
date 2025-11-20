import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Link,
  FormControl,
  FormHelperText,
} from '@mui/material';
import useResponsive from '@/hooks/useResponsive';
import { api } from '@/netlify/configs';
import { useGlobalSnackbar } from '@/context/app';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useResponsive();
  const showSnackbar = useGlobalSnackbar();

  // 从URL参数中获取重定向地址
  const getRedirectUrl = () => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('redirect') || '/cards';
  };

  // 状态管理
  const [currentMode, setCurrentMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    wechat: '',
  });
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    username?: string;
    email?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // 切换登录/注册模式
  const switchTab = (mode: 'login' | 'register') => {
    setCurrentMode(mode);
    setFormErrors({});
    setSuccess('');
  };

  // 更新表单数据
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // 清除对应字段的错误信息
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // 表单验证 - 使用MUI的表单验证方式
  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};
    let isValid = true;

    // 验证邮箱
    if (!formData.email) {
      errors.email = '请输入邮箱地址';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = '请输入有效的邮箱地址';
        isValid = false;
      }
    }

    // 验证密码
    if (!formData.password) {
      errors.password = '请输入密码';
      isValid = false;
    } else if (formData.password.length < 6) {
      errors.password = '密码长度至少为6位';
      isValid = false;
    }

    // 注册模式下的额外验证
    if (currentMode === 'register') {
      if (!formData.name) {
        errors.name = '请输入姓名';
        isValid = false;
      }

      if (!formData.username) {
        errors.username = '请输入用户名';
        isValid = false;
      } else if (formData.username.length < 3) {
        errors.username = '用户名长度至少为3位';
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 清除之前的成功消息
    setSuccess('');

    if (!validateForm()) {
      // 滚动到第一个错误字段
      const firstErrorField = Object.keys(formErrors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setLoading(true);

    try {
      let response;

      if (currentMode === 'login') {
        // 使用统一API封装进行登录
        response = await api.auth.login(formData.email, formData.password);
      } else {
        // 使用统一API封装进行注册
        response = await api.auth.register({
          name: formData.name,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          ...(formData.wechat ? { wechat: formData.wechat } : {}),
        });
      }

      // 检查响应是否成功
      if (!response.success) {
        throw new Error(response.error || '操作失败');
      }

      // 保存用户信息和token到localStorage
      const { token, user } = response.data || {};
      localStorage.setItem('authToken', token || '');
      localStorage.setItem('userData', JSON.stringify(user || {}));
      localStorage.setItem('userInfo', JSON.stringify(user || {})); // 兼容旧的userInfo存储键名
      localStorage.setItem('userId', user?.id || ''); // 兼容旧的userId存储

      setSuccess(currentMode === 'login' ? '登录成功' : '注册成功');

      // 延迟跳转，让用户看到成功消息
      setTimeout(() => {
        try {
          navigate(getRedirectUrl());
        } catch (err) {
          navigate('/cards');
        }
      }, 800);
    } catch (error: any) {
      console.error('认证错误:', error);
      showSnackbar.error(error.message || '网络错误，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: 8,
        background: 'var(--gradient-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{
              textAlign: 'center',
              mb: 4,
              color: 'var(--primary)',
              fontWeight: 'bold',
            }}
          >
            账户访问
          </Typography>

          <Tabs
            value={currentMode}
            onChange={(_, newValue) => switchTab(newValue)}
            centered
            sx={{
              mb: 4,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '1.1rem',
              },
              '& .Mui-selected': {
                fontWeight: 'bold',
                color: 'var(--primary)',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'var(--primary)',
              },
            }}
          >
            <Tab value="login" label="登录" />
            <Tab value="register" label="注册" />
          </Tabs>

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {currentMode === 'register' && (
              <FormControl fullWidth margin="normal" error={!!formErrors.name}>
                <TextField
                  label="姓名"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="请输入您的姓名"
                  required
                  variant="outlined"
                  size={isMobile ? 'small' : 'medium'}
                />
                {formErrors.name && (
                  <FormHelperText>{formErrors.name}</FormHelperText>
                )}
              </FormControl>
            )}

            {currentMode === 'register' && (
              <FormControl
                fullWidth
                margin="normal"
                error={!!formErrors.username}
              >
                <TextField
                  label="用户名"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="请输入用户名"
                  required
                  variant="outlined"
                  size={isMobile ? 'small' : 'medium'}
                />
                {formErrors.username && (
                  <FormHelperText>{formErrors.username}</FormHelperText>
                )}
              </FormControl>
            )}

            <FormControl fullWidth margin="normal" error={!!formErrors.email}>
              <TextField
                label="邮箱"
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="请输入邮箱地址"
                required
                variant="outlined"
                size={isMobile ? 'small' : 'medium'}
              />
              {formErrors.email && (
                <FormHelperText>{formErrors.email}</FormHelperText>
              )}
            </FormControl>

            <FormControl
              fullWidth
              margin="normal"
              error={!!formErrors.password}
            >
              <TextField
                label="密码"
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="请输入密码"
                required
                variant="outlined"
                size={isMobile ? 'small' : 'medium'}
                helperText={formErrors.password || '密码长度至少为6位'}
              />
            </FormControl>

            {currentMode === 'register' && (
              <TextField
                fullWidth
                margin="normal"
                label="微信号（可选）"
                id="wechat"
                name="wechat"
                value={formData.wechat}
                onChange={handleInputChange}
                placeholder="请输入微信号"
                variant="outlined"
                size={isMobile ? 'small' : 'medium'}
              />
            )}

            <Button
              fullWidth
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{
                mt: 4,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: '#5a67d8',
                },
              }}
            >
              {loading ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                  }}
                >
                  <CircularProgress size={20} color="inherit" />
                  处理中...
                </Box>
              ) : currentMode === 'login' ? (
                '登录'
              ) : (
                '注册'
              )}
            </Button>
          </form>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Link
              href="/"
              variant="body2"
              sx={{
                color: 'blue',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              返回首页
            </Link>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
