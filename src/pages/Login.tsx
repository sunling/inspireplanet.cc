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
  useMediaQuery,
  useTheme,
  Link,
} from '@mui/material';

// 定义认证相关接口
interface AuthResponse {
  message?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    name: string;
  };
  token?: string;
  error?: string;
}

const authFunctions = {
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`/.netlify/functions/authHandler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'login',
          email,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || '登录失败，请稍后重试');
    }
  },

  async register(data: {
    name: string;
    username: string;
    email: string;
    password: string;
    wechat?: string;
  }): Promise<AuthResponse> {
    try {
      const response = await fetch(`/.netlify/functions/authHandler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'register',
          ...data,
        }),
      });
      debugger;

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Register error:', error);
      throw new Error(error.message || '注册失败，请稍后重试');
    }
  },
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 切换登录/注册模式
  const switchTab = (mode: 'login' | 'register') => {
    setCurrentMode(mode);
    setError('');
    setSuccess('');
  };

  // 更新表单数据
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 表单验证
  const validateForm = () => {
    // 清除之前的消息
    setError('');
    setSuccess('');

    // 验证邮箱
    if (!formData.email) {
      setError('请输入邮箱地址');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('请输入有效的邮箱地址');
      return false;
    }

    // 验证密码
    if (!formData.password) {
      setError('请输入密码');
      return false;
    }

    if (formData.password.length < 6) {
      setError('密码长度至少为6位');
      return false;
    }

    // 注册模式下的额外验证
    if (currentMode === 'register') {
      if (!formData.name) {
        setError('请输入姓名');
        return false;
      }

      if (!formData.username) {
        setError('请输入用户名');
        return false;
      }

      if (formData.username.length < 3) {
        setError('用户名长度至少为3位');
        return false;
      }
    }

    return true;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let result;

      if (currentMode === 'login') {
        // 直接调用netlify function进行登录
        result = await authFunctions.login(formData.email, formData.password);

        // 检查是否有错误信息
        if (result.error) {
          throw new Error(result.error);
        }
      } else {
        // 直接调用netlify function进行注册
        result = await authFunctions.register({
          name: formData.name,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          ...(formData.wechat ? { wechat: formData.wechat } : {}),
        });

        // 检查是否有错误信息
        if (result.error) {
          throw new Error(result.error);
        }
      }

      // 保存用户信息和token到localStorage
      localStorage.setItem('authToken', result?.token || '');
      localStorage.setItem('userToken', result?.token || ''); // 兼容旧的token存储键名
      localStorage.setItem('userData', JSON.stringify(result?.user || {}));
      localStorage.setItem('userInfo', JSON.stringify(result?.user || {})); // 兼容旧的userInfo存储键名
      localStorage.setItem('userId', result?.user?.id || ''); // 兼容旧的userId存储

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
      setError(error.message || '网络错误，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: 8,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
              color: '#667eea',
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
                color: '#667eea',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#667eea',
              },
            }}
          >
            <Tab value="login" label="登录" />
            <Tab value="register" label="注册" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {currentMode === 'register' && (
              <TextField
                fullWidth
                margin="normal"
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
            )}

            {currentMode === 'register' && (
              <TextField
                fullWidth
                margin="normal"
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
            )}

            <TextField
              fullWidth
              margin="normal"
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

            <TextField
              fullWidth
              margin="normal"
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
              helperText="密码长度至少为6位"
            />

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
                backgroundColor: '#667eea',
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
                color: '#667eea',
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
