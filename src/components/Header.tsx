import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const menuRef = useRef<HTMLDivElement>(null);

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
          }}
        >
          {item.label}
        </Button>
      ))}
    </>
  );

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
          <ListItem component={Link} to="/" onClick={handleMenuClick}>
            <Home fontSize="small" sx={{ mr: 2 }} />
            <ListItemText primary="首页" />
          </ListItem>
          {navItems.map((item) => (
            <ListItem
              key={item.path}
              component={Link}
              to={item.path}
              onClick={handleMenuClick}
            >
              {item.icon}
              <ListItemText primary={item.label} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );

  const userMenuOpen = Boolean(userMenuAnchor);

  return (
    <AppBar
      position="static"
      elevation={3}
      sx={{ backgroundColor: '#fff', color: '#333' }}
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
                sx={{ fontWeight: 'bold' }}
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
              sx={{ ml: 2, backgroundColor: '#1976d2' }}
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
