import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
      // 准备发送到服务器的数据
      const data = {
        action: currentMode,
        email: formData.email,
        password: formData.password,
      };

      if (currentMode === 'register') {
        Object.assign(data, {
          name: formData.name,
          username: formData.username,
          wechat: formData.wechat,
        });
      }

      // 模拟API调用
      // 实际环境中应该使用fetch('/.netlify/functions/authHandler', ...)
      // 这里为了演示，使用模拟数据
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 模拟网络延迟

      // 模拟成功响应
      const mockResponse = {
        user: {
          id: 'user_123',
          name: formData.name || '用户',
          email: formData.email,
          username: formData.username || 'user123',
        },
        token: 'mock_token_123456',
        message: currentMode === 'login' ? '登录成功' : '注册成功',
      };

      // 保存用户信息和token到localStorage
      localStorage.setItem('authToken', mockResponse.token);
      localStorage.setItem('userData', JSON.stringify(mockResponse.user));

      setSuccess(mockResponse.message);

      // 延迟跳转，让用户看到成功消息
      setTimeout(() => {
        try {
          navigate(getRedirectUrl());
        } catch (err) {
          navigate('/cards');
        }
      }, 800);
    } catch (err) {
      console.error('认证错误:', err);
      setError('网络错误，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="tab-container">
        <button
          className={`tab ${currentMode === 'login' ? 'active' : ''}`}
          onClick={() => switchTab('login')}
        >
          登录
        </button>
        <button
          className={`tab ${currentMode === 'register' ? 'active' : ''}`}
          onClick={() => switchTab('register')}
        >
          注册
        </button>
      </div>

      <div className="form-container">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          {currentMode === 'register' && (
            <div className="form-group">
              <label htmlFor="name">姓名</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="请输入您的姓名"
                required
              />
            </div>
          )}

          {currentMode === 'register' && (
            <div className="form-group">
              <label htmlFor="username">用户名</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="请输入用户名"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">邮箱</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="请输入邮箱地址"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="请输入密码"
              required
            />
          </div>

          {currentMode === 'register' && (
            <div className="form-group">
              <label htmlFor="wechat">微信号（可选）</label>
              <input
                type="text"
                id="wechat"
                name="wechat"
                value={formData.wechat}
                onChange={handleInputChange}
                placeholder="请输入微信号"
              />
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="loading"></span>处理中...
              </>
            ) : currentMode === 'login' ? (
              '登录'
            ) : (
              '注册'
            )}
          </button>
        </form>

        <div className="back-link">
          <a href="/">返回首页</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
