import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
// 导入全局样式
import '/public/styles/main.css';
import '/public/styles/utility.css';
import '/public/styles/card-common.css';
import '/public/styles/card-gradients.css';
import '/public/styles/page-specific.css'; // 添加缺失的CSS文件

import Header from './components/Header';
import Footer from './components/Footer';

const App: React.FC = () => {
  // 用户认证状态
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');

  // 检查用户认证状态
  useEffect(() => {
    const checkAuth = () => {
      try {
        // 同时检查两种可能的token存储键名
        const token =
          localStorage.getItem('authToken') || localStorage.getItem('token');
        const userData = localStorage.getItem('userData');

        if (token && userData) {
          setIsAuthenticated(true);
          const user = JSON.parse(userData);
          setUserName(user.name || '用户');
        }
      } catch (error) {
        console.error('检查认证状态时出错:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // 退出登录函数
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    setUserName('');
  };

  return (
    <div className="app-container">
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

      {/* 底部组件 */}
      <Footer />
    </div>
  );
};

export default App;
