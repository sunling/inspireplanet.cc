import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
// 导入全局样式
import '/public/styles/main.css';
import '/public/styles/utility.css';
import '/public/styles/card-common.css';
import '/public/styles/card-gradients.css';
import '/public/styles/page-specific.css'; // 添加缺失的CSS文件

import Header from './components/Header';
import Footer from './components/Footer';
import MyCards from './pages/MyCards';
import Login from './pages/Login';
import Cards from './pages/Cards';
import CreateCard from './pages/CreateCard';
import CardDetail from './pages/CardDetail';
// 导入页面组件
import Home from './pages/Home';
import Meetups from './pages/Meetups';
import MeetupDetail from './pages/MeetupDetail';
import WeeklyCards from './pages/WeeklyCards';
import About from './pages/About';
import CardEdit from './pages/CardEdit';
import CoverEditor from './pages/CoverEditor';

// 占位符组件（后续需要逐个实现）
// 移除占位符定义并添加导入语句
import CreateMeetup from './pages/CreateMeetup';
// 移除原来的占位符定义
import CoverEditorMobile from './pages/CoverEditorMobile';

const App: React.FC = () => {
  // 用户认证状态
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>('');

  // 检查用户认证状态
  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('authToken');
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
    <Router>
      <div className="app-container">
        {/* 头部组件 */}
        <Header
          isAuthenticated={isAuthenticated}
          userName={userName}
          onLogout={handleLogout}
        />

        {/* 主内容区域 */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cards" element={<Cards />} />
            <Route
              path="/create-card"
              element={
                isAuthenticated ? <CreateCard /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/my-cards"
              element={isAuthenticated ? <MyCards /> : <Navigate to="/login" />}
            />
            <Route path="/meetups" element={<Meetups />} />
            <Route path="/weekly-cards" element={<WeeklyCards />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/card-detail/:id" element={<CardDetail />} />
            <Route
              path="/card-edit/:id"
              element={
                isAuthenticated ? <CardEdit /> : <Navigate to="/login" />
              }
            />
            <Route path="/meetup-detail/:id" element={<MeetupDetail />} />
            <Route
              path="/create-meetup"
              element={
                isAuthenticated ? <CreateMeetup /> : <Navigate to="/login" />
              }
            />
            <Route
              path="/my-meetups"
              element={isAuthenticated ? <Meetups /> : <Navigate to="/login" />}
            />
            <Route path="/cover-editor" element={<CoverEditor />} />
            <Route
              path="/cover-editor-mobile"
              element={<CoverEditorMobile />}
            />

            {/* 404 页面 */}
            <Route path="*" element={<div>页面不存在</div>} />
          </Routes>
        </main>

        {/* 底部组件 */}
        <Footer />
      </div>
    </Router>
  );
};

export default App;
