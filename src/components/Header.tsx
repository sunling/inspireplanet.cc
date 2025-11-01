import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  isAuthenticated: boolean;
  userName: string;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({
  isAuthenticated,
  userName,
  onLogout,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = () => {
    onLogout();
    setIsDropdownOpen(false);
    navigate('/');
  };

  return (
    <header className="site-header">
      <div className="header-container">
        <div className="header-left">
          <div className="site-branding">
            <Link to="/" className="site-title">
              <img
                src="/images/logo.png"
                alt="启发星球"
                className="site-logo"
              />
              启发星球
            </Link>
            <span className="site-subtitle">在真实中启发，在连接中发光</span>
          </div>
        </div>

        <nav className="header-nav">
          <Link to="/create-card" className="nav-link">
            创建卡片
          </Link>
          <Link to="/cards" className="nav-link">
            卡片广场
          </Link>
          <Link to="/my-cards" className="nav-link">
            我的卡片
          </Link>
          <Link to="/meetups" className="nav-link">
            活动广场
          </Link>
          <Link to="/weekly-cards" className="nav-link">
            启发星球周刊
          </Link>
          <Link to="/about" className="nav-link">
            关于我们
          </Link>
        </nav>

        <div className="header-right">
          {/* 未登录状态 */}
          {!isAuthenticated && (
            <div className="auth-section">
              <Link to="/login" className="login-btn">
                登录
              </Link>
            </div>
          )}

          {/* 已登录状态 */}
          {isAuthenticated && (
            <div
              className={`auth-section user-dropdown ${
                isDropdownOpen ? 'open' : ''
              }`}
            >
              <button className="user-btn" onClick={toggleDropdown}>
                <span>{userName}</span>
                <svg
                  className="dropdown-icon"
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                >
                  <path
                    d="M2 4l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  />
                </svg>
              </button>
              {isDropdownOpen && (
                <div className="dropdown-menu">
                  <Link to="/my-meetups" className="dropdown-item">
                    我的活动
                  </Link>
                  <button
                    className="dropdown-item logout-btn"
                    onClick={handleLogout}
                  >
                    退出登录
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
