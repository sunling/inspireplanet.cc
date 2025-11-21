import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import '@/styles/index.css';

import Header from './components/Header';
import Footer from './components/Footer';
import FloatingActions from './components/FloatingActions';

import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      light: '#ffa07a',
      main: '#ff7f50',
      dark: '#ff5a36',
      contrastText: '#fff',
    },
    secondary: {
      light: '#ff7961',
      main: '#f44336',
      dark: '#ba000d',
      contrastText: '#000',
    },
  },
});

const App: React.FC = () => {
  // 用户认证状态
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');
  const location = useLocation();

  // 检查用户认证状态
  useEffect(() => {
    const checkAuth = () => {
      try {
        const token =
          localStorage.getItem('authToken') || localStorage.getItem('token');
        const userData = localStorage.getItem('userData');

        if (token && userData) {
          setIsAuthenticated(true);
          const user = JSON.parse(userData);
          setUserName(user.name || '用户');
        } else {
          setIsAuthenticated(false);
          setUserName('');
        }
      } catch (error) {
        console.error('检查认证状态时出错:', error);
        setIsAuthenticated(false);
        setUserName('');
      }
    };

    checkAuth();
  }, [location.pathname, location.search, location.hash]);

  // 退出登录函数
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    setUserName('');
  };

  return (
    <div className="app-container">
      <ThemeProvider theme={theme}>
        {/* 头部组件 */}
        <Header
          isAuthenticated={isAuthenticated}
          userName={userName}
          onLogout={handleLogout}
        />

        {/* 主内容区域 - 使用Outlet渲染子路由 */}
        <main className="main-content">
          <Outlet />
        </main>

        <FloatingActions />

        {/* 底部组件 */}
        <Footer />
      </ThemeProvider>
    </div>
  );
};

export default App;
