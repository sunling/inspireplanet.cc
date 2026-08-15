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
  Forum,
  EditNote,
  AccountCircle,
  Logout,
  Lock,
  AutoStoriesOutlined,
} from '@mui/icons-material';
import { notificationsApi, weeklyCardsApi } from '../netlify/config';
import { isOrganizer } from '../utils/user';

interface HeaderProps {
  isAuthenticated: boolean;
  userName: string;
  onLogout: () => void | Promise<void>;
}

// 菜单项类型定义
interface NavItem {
  path?: string;
  href?: string;
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
  const [toolsMenuAnchor, setToolsMenuAnchor] = useState<HTMLElement | null>(
    null
  );
  const [activitiesMenuAnchor, setActivitiesMenuAnchor] =
    useState<HTMLElement | null>(null);
  const [cardsMenuAnchor, setCardsMenuAnchor] = useState<HTMLElement | null>(
    null
  );
  const [weeklyMenuAnchor, setWeeklyMenuAnchor] = useState<HTMLElement | null>(
    null
  );
  const [writingMenuAnchor, setWritingMenuAnchor] =
    useState<HTMLElement | null>(null);
  const [unread, setUnread] = useState(0);
  const [latestResponseWallHref, setLatestResponseWallHref] = useState<
    string | null
  >(null);

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

  useEffect(() => {
    let active = true;
    const loadLatestResponseWallHref = async () => {
      try {
        const response = await weeklyCardsApi.getLatest();
        const latestCard = response.data?.records?.[0];
        const episodeNumber = latestCard?.episode?.replace(/\D/g, '');
        const createdAt = latestCard?.created
          ? new Date(latestCard.created)
          : null;
        if (
          !active ||
          !episodeNumber ||
          !createdAt ||
          Number.isNaN(createdAt.getTime())
        )
          return;
        const year = new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          timeZone: 'Asia/Shanghai',
        }).format(createdAt);
        setLatestResponseWallHref(
          `https://inspireplanet.cc/episodes/${year}/${episodeNumber}`
        );
      } catch (error) {
        console.error('加载最新一期回应墙地址失败:', error);
      }
    };
    loadLatestResponseWallHref();
    return () => {
      active = false;
    };
  }, []);

  // 判断当前路由是否匹配
  const isActiveRoute = (path?: string): boolean => {
    if (!path) return false;
    return location.pathname === path;
  };

  // 菜单处理函数
  const handleMenuToggle = () => setIsMenuOpen(!isMenuOpen);
  const handleMenuClick = () => setIsMenuOpen(false);

  const handleLogout = async () => {
    await onLogout();
    setUserMenuAnchor(null);
    navigate('/');
  };

  // 菜单项定义
  const topNavItems: NavItem[] = [
    { path: '/', label: '首页', icon: <Home fontSize="small" /> },
    {
      path: '/clarify-together',
      label: '对话实验',
      icon: <Forum fontSize="small" />,
    },
  ];

  const weeklyMenuItems: NavItem[] = [
    { path: '/weekly-cards', label: '阅读启发周刊' },
    ...(latestResponseWallHref
      ? [{ href: latestResponseWallHref, label: '查看最新回应墙' }]
      : []),
  ];

  const writingMenuItems: NavItem[] = [
    { path: '/writing-circle', label: '进入圈子' },
    ...(isOrganizer()
      ? [{ path: '/admin/writing-circle', label: '圈子后台' }]
      : []),
  ];

  // 构建活动菜单，只对 organizer 显示报名管理
  const getActivitiesMenuItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      { path: '/meetups', label: '活动列表' },
      { path: '/activity-calendar', label: '活动日历' },
    ];

    if (isOrganizer()) {
      baseItems.push({ path: '/create-meetup', label: '创建活动' });
      baseItems.push({ path: '/meetup-participants-list', label: '报名管理' });
    }

    return baseItems;
  };

  const toolsMenuItems: NavItem[] = [
    { path: '/page-poster', label: '页面分享海报' },
    { path: '/cover-editor', label: '横版封面制作' },
    { path: '/cover-editor-mobile', label: '竖版封面制作' },
    { path: '/surveys', label: '调查问卷' },
  ];

  const cardsMenuItems: NavItem[] = [
    { path: '/cards', label: '近期卡片' },
    { path: '/create-card', label: '创建卡片' },
  ];

  // 下拉菜单配置
  const dropdownMenus: DropdownMenu[] = [
    {
      label: '启发周刊',
      icon: <CardMembership fontSize="small" />,
      items: weeklyMenuItems,
      anchor: weeklyMenuAnchor,
      setAnchor: setWeeklyMenuAnchor,
    },
    {
      label: '书写圈子',
      icon: <EditNote fontSize="small" />,
      items: writingMenuItems,
      anchor: writingMenuAnchor,
      setAnchor: setWritingMenuAnchor,
    },
    {
      label: '活动',
      icon: <CalendarToday fontSize="small" />,
      items: getActivitiesMenuItems(),
      anchor: activitiesMenuAnchor,
      setAnchor: setActivitiesMenuAnchor,
    },
    {
      label: '金句卡片',
      icon: <CardMembership fontSize="small" />,
      items: cardsMenuItems,
      anchor: cardsMenuAnchor,
      setAnchor: setCardsMenuAnchor,
    },
    ...(isOrganizer()
      ? [
          {
            label: '工具',
            icon: <CardMembership fontSize="small" />,
            items: toolsMenuItems,
            anchor: toolsMenuAnchor,
            setAnchor: setToolsMenuAnchor,
          },
        ]
      : []),
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
        {menu.items.map((item) =>
          item.href ? (
            <MenuItem
              key={item.href}
              component="a"
              href={item.href}
              onClick={() => menu.setAnchor(null)}
            >
              <ListItemText primary={item.label} sx={{ pl: 1 }} />
            </MenuItem>
          ) : (
            <MenuItem
              key={item.path}
              component={Link}
              to={item.path || '/'}
              onClick={() => menu.setAnchor(null)}
            >
              <ListItemText primary={item.label} sx={{ pl: 1 }} />
            </MenuItem>
          )
        )}
      </Menu>
    </div>
  );

  // 渲染导航链接
  const renderNavLinks = () => (
    <>
      {/* 顶级菜单 */}
      {topNavItems.map((item) =>
        item.href ? (
          <Button
            key={item.href}
            color="inherit"
            startIcon={item.icon}
            component="a"
            href={item.href}
            sx={{
              marginLeft: 1,
              display: { xs: 'none', md: 'flex' },
              textTransform: 'none',
              fontSize: '0.9rem',
            }}
          >
            {item.label}
          </Button>
        ) : (
          <Button
            key={item.path}
            color="inherit"
            startIcon={item.icon}
            component={Link}
            to={item.path || '/'}
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
        )
      )}

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
      {items.map((item) =>
        item.href ? (
          <ListItem
            key={item.href}
            component="a"
            href={item.href}
            onClick={handleMenuClick}
            sx={{
              pl: 5,
              color: 'grey',
              textDecoration: 'none',
              '&:hover': { backgroundColor: '#fff9f0' },
            }}
          >
            <ListItemText primary={item.label} sx={{ pl: 1 }} />
          </ListItem>
        ) : (
          <ListItem
            key={item.path}
            component={Link}
            to={item.path || '/'}
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
        )
      )}
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
          {topNavItems.map((item) =>
            item.href ? (
              <ListItem
                key={item.href}
                component="a"
                href={item.href}
                onClick={handleMenuClick}
                sx={{
                  color: 'grey',
                  textDecoration: 'none',
                  '&:hover': { backgroundColor: '#fff9f0' },
                }}
              >
                {item.icon}
                <ListItemText primary={item.label} sx={{ pl: 1 }} />
              </ListItem>
            ) : (
              <ListItem
                key={item.path}
                component={Link}
                to={item.path || '/'}
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
            )
          )}

          {/* 移动端菜单组 */}
          {renderMobileMenuItemGroup(
            '启发周刊',
            <CardMembership fontSize="small" />,
            weeklyMenuItems
          )}
          {renderMobileMenuItemGroup(
            '书写圈子',
            <EditNote fontSize="small" />,
            writingMenuItems
          )}
          {renderMobileMenuItemGroup(
            '活动',
            <CalendarToday fontSize="small" />,
            getActivitiesMenuItems()
          )}
          {renderMobileMenuItemGroup(
            '金句卡片',
            <CardMembership fontSize="small" />,
            cardsMenuItems
          )}
          {isOrganizer() &&
            renderMobileMenuItemGroup(
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
                  to="/my-ebook"
                  onClick={() => setUserMenuAnchor(null)}
                >
                  <AutoStoriesOutlined fontSize="small" sx={{ mr: 1 }} />
                  我的电子书
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
                  to="/writing-circle?scope=mine"
                  onClick={() => setUserMenuAnchor(null)}
                >
                  <Forum fontSize="small" sx={{ mr: 1 }} />
                  我的书写
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
                  个人资料
                </MenuItem>
                <MenuItem
                  component={Link}
                  to="/change-password"
                  onClick={() => setUserMenuAnchor(null)}
                >
                  <Lock fontSize="small" sx={{ mr: 1 }} />
                  修改密码
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
