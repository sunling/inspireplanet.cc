import React, { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Box,
  Menu,
  MenuItem,
} from '@mui/material';
import { useResponsive } from '../hooks/useResponsive';
import {
  Menu as MenuIcon,
  ExpandMore as ChevronDown,
  Home,
  Add,
  CardMembership,
  CalendarToday,
  Book,
  Info,
  AccountCircle,
  Logout,
} from '@mui/icons-material';

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
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useResponsive();
  const menuRef = useRef<HTMLDivElement>(null);

  // 判断当前路由是否匹配
  const isActiveRoute = (path: string): boolean => {
    return location.pathname === path;
  };

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    onLogout();
    handleUserMenuClose();
    navigate('/');
  };

  const handleMenuClick = () => {
    setIsMenuOpen(false);
  };

  const navItems = [
    { path: '/home', label: '首页', icon: <Home fontSize="small" /> },
    { path: '/create-card', label: '创建卡片', icon: <Add fontSize="small" /> },
    {
      path: '/cards',
      label: '卡片广场',
      icon: <CardMembership fontSize="small" />,
    },
    {
      path: '/my-cards',
      label: '我的卡片',
      icon: <AccountCircle fontSize="small" />,
    },
    {
      path: '/meetups',
      label: '活动广场',
      icon: <CalendarToday fontSize="small" />,
    },
    {
      path: '/weekly-cards',
      label: '启发星球周刊',
      icon: <Book fontSize="small" />,
    },
    { path: '/about', label: '关于我们', icon: <Info fontSize="small" /> },
  ];

  const renderNavLinks = () => (
    <>
      {navItems.map((item) => (
        <Button
          key={item.path}
          color="inherit"
          startIcon={item.icon}
          component={Link}
          to={item.path}
          sx={{
            marginLeft: 1,
            display: { xs: 'none', md: 'flex' },
            textTransform: 'none',
            fontSize: '0.9rem',
            fontWeight: isActiveRoute(item.path) ? 'bold' : 'normal',
            color: isActiveRoute(item.path) ? '#ff7f50' : 'inherit',
          }}
        >
          {item.label}
        </Button>
      ))}
    </>
  );

  // 移动端导航
  const renderMobileMenu = () => (
    <Drawer anchor="left" open={isMenuOpen} onClose={handleMenuToggle}>
      <Box sx={{ width: 250, padding: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <img
            src="/images/logo.png"
            alt="启发星球"
            style={{ width: 32, height: 32, marginRight: 8 }}
          />

          <Typography variant="h6" color="primary">
            启发星球
          </Typography>
        </Box>
        <List>
          {navItems.map((item) => (
            <ListItem
              key={item.path}
              component={Link}
              to={item.path}
              onClick={handleMenuClick}
              sx={{
                color: isActiveRoute(item.path) ? '#ff7f50' : 'grey',
                backgroundColor: isActiveRoute(item.path)
                  ? '#fff9f0'
                  : 'transparent',
                '&:hover': {
                  backgroundColor: '#fff9f0',
                },
                borderLeft: isActiveRoute(item.path)
                  ? '4px solid #fff9f0'
                  : 'none',
              }}
            >
              {item.icon}
              <ListItemText primary={item.label} sx={{ pl: 1 }} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );

  const userMenuOpen = Boolean(userMenuAnchor);

  return (
    <AppBar
      position="sticky"
      elevation={1}
      sx={{ backgroundColor: 'white', color: 'var(--text)' }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleMenuToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <img
              src="/images/logo.png"
              alt="启发星球"
              style={{ width: 32, height: 32, marginRight: 8 }}
            />
            <div>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 'bold',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                启发星球
              </Typography>
              <Typography
                variant="caption"
                sx={{ display: { xs: 'none', sm: 'block' } }}
              >
                在真实中启发，在连接中发光
              </Typography>
            </div>
          </Link>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {!isMobile && renderNavLinks()}

          {!isAuthenticated ? (
            <Button
              color="primary"
              variant="contained"
              component={Link}
              to="/login"
              sx={{ ml: 2, backgroundColor: '#ff7f50' }}
            >
              登录
            </Button>
          ) : (
            <div ref={menuRef}>
              <Button
                color="inherit"
                onClick={handleUserMenuOpen}
                startIcon={<AccountCircle />}
                endIcon={<ChevronDown fontSize="small" />}
                sx={{ ml: 2, textTransform: 'none' }}
              >
                {userName}
              </Button>
              <Menu
                anchorEl={userMenuAnchor}
                open={userMenuOpen}
                onClose={handleUserMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem
                  component={Link}
                  to="/my-meetups"
                  onClick={handleUserMenuClose}
                >
                  <CalendarToday fontSize="small" sx={{ mr: 1 }} />
                  我的活动
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <Logout fontSize="small" sx={{ mr: 1 }} />
                  退出登录
                </MenuItem>
              </Menu>
            </div>
          )}
        </Box>
      </Toolbar>
      {renderMobileMenu()}
    </AppBar>
  );
};

export default Header;
