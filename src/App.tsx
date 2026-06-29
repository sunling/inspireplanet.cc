import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import '@/styles/index.css';

import Header from './components/Header';
import Footer from './components/Footer';
import PWAInstallPrompt from './components/PWAInstallPrompt';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
  getUserName,
  isUserLoggedIn,
  logoutUser,
  syncUserAuthFromSession,
} from './utils/user';
import { Snackbar, Alert, Button } from '@mui/material';

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

  // PWA更新状态
  const [showUpdateAlert, setShowUpdateAlert] = useState<boolean>(false);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  // 检查用户认证状态
  useEffect(() => {
    let cancelled = false;
    const checkAuth = async () => {
      try {
        const syncedUser = await syncUserAuthFromSession();
        if (cancelled) return;

        if (syncedUser || isUserLoggedIn()) {
          setIsAuthenticated(true);
          setUserName(syncedUser?.name || syncedUser?.username || getUserName() || '用户');
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
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, location.hash]);

  // 注册Service Worker并检查更新
  useEffect(() => {
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const swRegistration =
            await navigator.serviceWorker.register('/sw.js');
          setRegistration(swRegistration);

          // 检查是否已经提醒过用户
          const lastNotified = localStorage.getItem(
            'lastPwaUpdateNotification'
          );
          const now = Date.now();
          const oneDayAgo = now - 24 * 60 * 60 * 1000;

          // 只有当上次提醒超过1天或从未提醒过时才检查更新
          if (!lastNotified || parseInt(lastNotified) < oneDayAgo) {
            // 检查是否有等待中的更新
            if (swRegistration.waiting) {
              setShowUpdateAlert(true);
              localStorage.setItem('lastPwaUpdateNotification', now.toString());
            }

            // 监听更新事件
            swRegistration.addEventListener('updatefound', () => {
              const newWorker = swRegistration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (
                    newWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                  ) {
                    setShowUpdateAlert(true);
                    localStorage.setItem(
                      'lastPwaUpdateNotification',
                      now.toString()
                    );
                  }
                });
              }
            });
          }
        } catch (error) {
          console.error('Service Worker注册失败:', error);
        }
      }
    };

    registerServiceWorker();
  }, []);

  // 处理更新
  const handleUpdate = () => {
    if (registration && registration.waiting) {
      // 发送消息给Service Worker，让它跳过等待
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      // 刷新页面以使用新的Service Worker
      window.location.reload();
    }
  };

  // 退出登录函数
  const handleLogout = async () => {
    await logoutUser();
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

        {/* PWA安装提示 */}
        <PWAInstallPrompt />

        {/* 底部组件 */}
        <Footer />

        {/* PWA更新提示 */}
        <Snackbar
          open={showUpdateAlert}
          autoHideDuration={6000}
          onClose={() => setShowUpdateAlert(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity="info"
            action={
              <Button color="inherit" size="small" onClick={handleUpdate}>
                刷新
              </Button>
            }
          >
            应用有新的更新可用
          </Alert>
        </Snackbar>
      </ThemeProvider>
    </div>
  );
};

export default App;
