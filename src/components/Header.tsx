import React, { useState, useRef, useEffect } from 'react';
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
  Badge,
} from '@mui/material';
import { useResponsive } from '../hooks/useResponsive';
import {
  Menu as MenuIcon,
  ExpandMore as ChevronDown,
  Home,
  CardMembership,
  CalendarToday,
  Info,
  AccountCircle,
  Logout,
} from '@mui/icons-material';
import { notificationsApi } from '../netlify/config';

interface HeaderProps {
  isAuthenticated: boolean;
  userName: string;
  onLogout: () => void;
}

// 菜单项类型定义
interface NavItem {
  path: string;
  label: string;
  icon?: React.ReactNode;
}

// 下拉菜单类型定义
interface DropdownMenu {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  anchor: HTMLElement | null;
  setAnchor: (anchor: HTMLElement | null) => void;
}

const Header: React.FC<HeaderProps> = ({
  isAuthenticated,
  userName,
  onLogout,
}) => {
  // 状态管理
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(
    null
  );
  const [cardsMenuAnchor, setCardsMenuAnchor] = useState<HTMLElement | null>(
    null
  );
  const [toolsMenuAnchor, setToolsMenuAnchor] = useState<HTMLElement | null>(
    null
  );
  const [activitiesMenuAnchor, setActivitiesMenuAnchor] =
    useState<HTMLElement | null>(null);
  const [unread, setUnread] = useState(0);

  // 路由和响应式
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useResponsive();
  const menuRef = useRef<HTMLDivElement>(null);

  // 获取未读通知
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const loadUnreadNotifications = async () => {
      try {
        const res = await notificationsApi.list({
          status: 'unread',
          limit: 100,
        });
        if (res.success) {
          setUnread(res.data?.notifications?.length || 0);
        }
      } catch {}
    };

    loadUnreadNotifications();
  }, [location.pathname]);

  // 判断当前路由是否匹配
  const isActiveRoute = (path: string): boolean => {
    return location.pathname === path;
  };

  // 菜单处理函数
  const handleMenuToggle = () => setIsMenuOpen(!isMenuOpen);
  const handleMenuClick = () => setIsMenuOpen(false);

  const handleLogout = () => {
    onLogout();
    setUserMenuAnchor(null);
    navigate('/');
  };

  // 菜单项定义
  const topNavItems: NavItem[] = [
    { path: '', label: '首页', icon: <Home fontSize="small" /> },
  ];

  const cardsMenuItems: NavItem[] = [
    { path: '/create-card', label: '创建卡片' },
    { path: '/cards', label: '卡片广场' },
    { path: '/weekly-cards', label: '启发星球周刊' },
  ];

  const activitiesMenuItems: NavItem[] = [
    { path: '/meetups', label: '活动广场' },
    { path: '/activity-calendar', label: '活动日历' },
    { path: '/people', label: '找人聊聊' },
    { path: '/create-meetup', label: '创建活动' },
  ];

  const toolsMenuItems: NavItem[] = [
    { path: '/cover-editor', label: '横版封面制作' },
    { path: '/cover-editor-mobile', label: '竖版封面制作' },
    { path: '/surveys', label: '调查问卷' },
  ];

  // 下拉菜单配置
  const dropdownMenus: DropdownMenu[] = [
    {
      label: '知识卡片',
      icon: <CardMembership fontSize="small" />,
      items: cardsMenuItems,
      anchor: cardsMenuAnchor,
      setAnchor: setCardsMenuAnchor,
    },
    {
      label: '活动',
      icon: <CalendarToday fontSize="small" />,
      items: activitiesMenuItems,
      anchor: activitiesMenuAnchor,
      setAnchor: setActivitiesMenuAnchor,
    },
    {
      label: '工具',
      icon: <CardMembership fontSize="small" />,
      items: toolsMenuItems,
      anchor: toolsMenuAnchor,
      setAnchor: setToolsMenuAnchor,
    },
  ];

  // 渲染下拉菜单
  const renderDropdownMenu = (menu: DropdownMenu) => (
    <div key={menu.label}>
      <Button
        color="inherit"
        startIcon={menu.icon}
        endIcon={<ChevronDown fontSize="small" />}
        onClick={(e) => menu.setAnchor(e.currentTarget)}
        sx={{
          marginLeft: 1,
          boxShadow: 'none',
          display: { xs: 'none', md: 'flex' },
          textTransform: 'none',
          fontSize: '0.9rem',
          fontWeight: menu.items.some((item) => isActiveRoute(item.path))
            ? 'bold'
            : 'normal',
          color: menu.items.some((item) => isActiveRoute(item.path))
            ? '#ff7f50'
            : 'inherit',
        }}
      >
        {menu.label}
      </Button>
      <Menu
        anchorEl={menu.anchor}
        open={Boolean(menu.anchor)}
        onClose={() => menu.setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {menu.items.map((item) => (
          <MenuItem
            key={item.path}
            component={Link}
            to={item.path}
            onClick={() => menu.setAnchor(null)}
          >
            <ListItemText primary={item.label} sx={{ pl: 1 }} />
          </MenuItem>
        ))}
      </Menu>
    </div>
  );

  // 渲染导航链接
  const renderNavLinks = () => (
    <>
      {/* 顶级菜单 */}
      {topNavItems.map((item) => (
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

      {/* 下拉菜单 */}
      {dropdownMenus.map((menu) => renderDropdownMenu(menu))}

      {/* 关于我们 */}
      <Button
        color="inherit"
        startIcon={<Info fontSize="small" />}
        component={Link}
        to="/about"
        sx={{
          marginLeft: 1,
          display: { xs: 'none', md: 'flex' },
          textTransform: 'none',
          fontSize: '0.9rem',
          fontWeight: isActiveRoute('/about') ? 'bold' : 'normal',
          color: isActiveRoute('/about') ? '#ff7f50' : 'inherit',
        }}
      >
        关于我们
      </Button>
    </>
  );

  // 渲染移动端菜单项组
  const renderMobileMenuItemGroup = (
    label: string,
    icon: React.ReactNode,
    items: NavItem[]
  ) => (
    <>
      <ListItem
        key={label}
        sx={{
          color: items.some((item) => isActiveRoute(item.path))
            ? '#ff7f50'
            : 'grey',
          backgroundColor: items.some((item) => isActiveRoute(item.path))
            ? '#fff9f0'
            : 'transparent',
          borderLeft: items.some((item) => isActiveRoute(item.path))
            ? '4px solid #fff9f0'
            : 'none',
        }}
      >
        {icon}
        <ListItemText primary={label} sx={{ pl: 1 }} />
      </ListItem>
      {items.map((item) => (
        <ListItem
          key={item.path}
          component={Link}
          to={item.path}
          onClick={handleMenuClick}
          sx={{
            pl: 5,
            color: isActiveRoute(item.path) ? '#ff7f50' : 'grey',
            backgroundColor: isActiveRoute(item.path)
              ? '#fff9f0'
              : 'transparent',
            '&:hover': { backgroundColor: '#fff9f0' },
          }}
        >
          <ListItemText primary={item.label} sx={{ pl: 1 }} />
        </ListItem>
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
          {/* 顶级菜单项 */}
          {topNavItems.map((item) => (
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
                '&:hover': { backgroundColor: '#fff9f0' },
                borderLeft: isActiveRoute(item.path)
                  ? '4px solid #fff9f0'
                  : 'none',
              }}
            >
              {item.icon}
              <ListItemText primary={item.label} sx={{ pl: 1 }} />
            </ListItem>
          ))}

          {/* 移动端菜单组 */}
          {renderMobileMenuItemGroup(
            '知识卡片',
            <CardMembership fontSize="small" />,
            cardsMenuItems
          )}
          {renderMobileMenuItemGroup(
            '活动',
            <CalendarToday fontSize="small" />,
            activitiesMenuItems
          )}
          {renderMobileMenuItemGroup(
            '工具',
            <CardMembership fontSize="small" />,
            toolsMenuItems
          )}

          {/* 移动端：关于我们 */}
          <ListItem
            component={Link}
            to="/about"
            onClick={handleMenuClick}
            sx={{
              color: isActiveRoute('/about') ? '#ff7f50' : 'grey',
              backgroundColor: isActiveRoute('/about')
                ? '#fff9f0'
                : 'transparent',
              '&:hover': { backgroundColor: '#fff9f0' },
              borderLeft: isActiveRoute('/about')
                ? '4px solid #fff9f0'
                : 'none',
            }}
          >
            <Info fontSize="small" />
            <ListItemText primary="关于我们" sx={{ pl: 1 }} />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );

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
              to={`/login?redirect=${encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)}`}
              sx={{ ml: 2, backgroundColor: '#ff7f50', boxShadow: 'none' }}
            >
              登录
            </Button>
          ) : (
            <div ref={menuRef}>
              <Button
                color="inherit"
                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                startIcon={
                  <Badge
                    color="error"
                    badgeContent={unread}
                    max={9}
                    invisible={unread === 0}
                  >
                    <AccountCircle />
                  </Badge>
                }
                endIcon={<ChevronDown fontSize="small" />}
                sx={{ ml: 2, textTransform: 'none', boxShadow: 'none' }}
              >
                {userName}
              </Button>
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={() => setUserMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem
                  component={Link}
                  to="/notifications"
                  onClick={() => setUserMenuAnchor(null)}
                >
                  <Badge
                    color="error"
                    badgeContent={unread}
                    max={9}
                    sx={{ mr: 1 }}
                  >
                    <AccountCircle fontSize="small" />
                  </Badge>
                  通知
                </MenuItem>
                <MenuItem
                  component={Link}
                  to="/my-cards"
                  onClick={() => setUserMenuAnchor(null)}
                >
                  <CardMembership fontSize="small" sx={{ mr: 1 }} />
                  我的卡片
                </MenuItem>
                <MenuItem
                  component={Link}
                  to="/my-meetups"
                  onClick={() => setUserMenuAnchor(null)}
                >
                  <CalendarToday fontSize="small" sx={{ mr: 1 }} />
                  我的活动
                </MenuItem>
                <MenuItem
                  component={Link}
                  to="/connections"
                  onClick={() => setUserMenuAnchor(null)}
                >
                  <CalendarToday fontSize="small" sx={{ mr: 1 }} />
                  我的连接
                </MenuItem>
                <MenuItem
                  component={Link}
                  to="/profile"
                  onClick={() => setUserMenuAnchor(null)}
                >
                  <AccountCircle fontSize="small" sx={{ mr: 1 }} />
                  完善资料
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
