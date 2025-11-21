import React, { useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
} from "@mui/material";
import { useResponsive } from "../hooks/useResponsive";
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
  Image as ImageIcon,
} from "@mui/icons-material";

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
  const [coverMenuAnchor, setCoverMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [cardsMenuAnchor, setCardsMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [activitiesMenuAnchor, setActivitiesMenuAnchor] =
    useState<null | HTMLElement>(null);
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

  const handleCoverMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setCoverMenuAnchor(event.currentTarget);
  };

  const handleCoverMenuClose = () => {
    setCoverMenuAnchor(null);
  };

  const handleCardsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setCardsMenuAnchor(event.currentTarget);
  };

  const handleCardsMenuClose = () => {
    setCardsMenuAnchor(null);
  };

  const handleActivitiesMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setActivitiesMenuAnchor(event.currentTarget);
  };

  const handleActivitiesMenuClose = () => {
    setActivitiesMenuAnchor(null);
  };

  const handleCoverMenuClick = (path: string) => {
    navigate(path);
    handleCoverMenuClose();
  };

  const handleLogout = () => {
    onLogout();
    handleUserMenuClose();
    navigate("/");
  };

  const handleMenuClick = () => {
    setIsMenuOpen(false);
  };

  const topNavItems = [
    { path: "", label: "首页", icon: <Home fontSize="small" /> },
  ];

  const cardsMenuItems = [
    { path: "/create-card", label: "创建卡片" },
    { path: "/cards", label: "卡片广场" },
    { path: "/weekly-cards", label: "启发星球周刊" },
  ];

  const activitiesMenuItems = [
    { path: "/meetups", label: "活动广场" },
    { path: "/create-meetup", label: "创建活动" },
  ];

  const coverMenuItems = [
    {
      path: "/cover-editor",
      label: "横屏封面",
    },
    {
      path: "/cover-editor-mobile",
      label: "竖屏封面",
    },
  ];

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
            display: { xs: "none", md: "flex" },
            textTransform: "none",
            fontSize: "0.9rem",
            fontWeight: isActiveRoute(item.path) ? "bold" : "normal",
            color: isActiveRoute(item.path) ? "#ff7f50" : "inherit",
          }}
        >
          {item.label}
        </Button>
      ))}

      {/* 知识卡片分组 */}
      <>
        <Button
          color="inherit"
          startIcon={<CardMembership fontSize="small" />}
          endIcon={<ChevronDown fontSize="small" />}
          onClick={handleCardsMenuOpen}
          sx={{
            marginLeft: 1,
            boxShadow: "none",
            display: { xs: "none", md: "flex" },
            textTransform: "none",
            fontSize: "0.9rem",
            fontWeight: cardsMenuItems.some((item) => isActiveRoute(item.path))
              ? "bold"
              : "normal",
            color: cardsMenuItems.some((item) => isActiveRoute(item.path))
              ? "#ff7f50"
              : "inherit",
          }}
        >
          知识卡片
        </Button>
        <Menu
          anchorEl={cardsMenuAnchor}
          open={Boolean(cardsMenuAnchor)}
          onClose={handleCardsMenuClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
        >
          {cardsMenuItems.map((item) => (
            <MenuItem
              key={item.path}
              component={Link}
              to={item.path}
              onClick={handleCardsMenuClose}
            >
              <ListItemText primary={item.label} sx={{ pl: 1 }} />
            </MenuItem>
          ))}
        </Menu>
      </>

      {/* 活动分组 */}
      <>
        <Button
          color="inherit"
          startIcon={<CalendarToday fontSize="small" />}
          endIcon={<ChevronDown fontSize="small" />}
          onClick={handleActivitiesMenuOpen}
          sx={{
            marginLeft: 1,
            boxShadow: "none",
            display: { xs: "none", md: "flex" },
            textTransform: "none",
            fontSize: "0.9rem",
            fontWeight: activitiesMenuItems.some((item) =>
              isActiveRoute(item.path)
            )
              ? "bold"
              : "normal",
            color: activitiesMenuItems.some((item) => isActiveRoute(item.path))
              ? "#ff7f50"
              : "inherit",
          }}
        >
          活动
        </Button>
        <Menu
          anchorEl={activitiesMenuAnchor}
          open={Boolean(activitiesMenuAnchor)}
          onClose={handleActivitiesMenuClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
        >
          {activitiesMenuItems.map((item) => (
            <MenuItem
              key={item.path}
              component={Link}
              to={item.path}
              onClick={handleActivitiesMenuClose}
            >
              <ListItemText primary={item.label} sx={{ pl: 1 }} />
            </MenuItem>
          ))}
        </Menu>
      </>

      {/* 关于我们 */}
      <Button
        color="inherit"
        startIcon={<Info fontSize="small" />}
        component={Link}
        to="/about"
        sx={{
          marginLeft: 1,
          display: { xs: "none", md: "flex" },
          textTransform: "none",
          fontSize: "0.9rem",
          fontWeight: isActiveRoute("/about") ? "bold" : "normal",
          color: isActiveRoute("/about") ? "#ff7f50" : "inherit",
        }}
      >
        关于我们
      </Button>
    </>
  );

  // 移动端导航
  const renderMobileMenu = () => (
    <Drawer anchor="left" open={isMenuOpen} onClose={handleMenuToggle}>
      <Box sx={{ width: 250, padding: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
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
                color: isActiveRoute(item.path) ? "#ff7f50" : "grey",
                backgroundColor: isActiveRoute(item.path)
                  ? "#fff9f0"
                  : "transparent",
                "&:hover": {
                  backgroundColor: "#fff9f0",
                },
                borderLeft: isActiveRoute(item.path)
                  ? "4px solid #fff9f0"
                  : "none",
              }}
            >
              {item.icon}
              <ListItemText primary={item.label} sx={{ pl: 1 }} />
            </ListItem>
          ))}

          {/* 移动端：知识开票菜单组 */}
          <ListItem
            sx={{
              color: cardsMenuItems.some((item) => isActiveRoute(item.path))
                ? "#ff7f50"
                : "grey",
              backgroundColor: cardsMenuItems.some((item) =>
                isActiveRoute(item.path)
              )
                ? "#fff9f0"
                : "transparent",
              borderLeft: cardsMenuItems.some((item) =>
                isActiveRoute(item.path)
              )
                ? "4px solid #fff9f0"
                : "none",
            }}
          >
            <CardMembership fontSize="small" />
            <ListItemText primary="知识卡片" sx={{ pl: 1 }} />
          </ListItem>
          {cardsMenuItems.map((item) => (
            <ListItem
              key={item.path}
              component={Link}
              to={item.path}
              onClick={handleMenuClick}
              sx={{
                pl: 5,
                color: isActiveRoute(item.path) ? "#ff7f50" : "grey",
                backgroundColor: isActiveRoute(item.path)
                  ? "#fff9f0"
                  : "transparent",
                "&:hover": {
                  backgroundColor: "#fff9f0",
                },
              }}
            >
              <ListItemText primary={item.label} sx={{ pl: 1 }} />
            </ListItem>
          ))}

          {/* 移动端：活动菜单组 */}
          <ListItem
            sx={{
              color: activitiesMenuItems.some((item) =>
                isActiveRoute(item.path)
              )
                ? "#ff7f50"
                : "grey",
              backgroundColor: activitiesMenuItems.some((item) =>
                isActiveRoute(item.path)
              )
                ? "#fff9f0"
                : "transparent",
              borderLeft: activitiesMenuItems.some((item) =>
                isActiveRoute(item.path)
              )
                ? "4px solid #fff9f0"
                : "none",
            }}
          >
            <CalendarToday fontSize="small" />
            <ListItemText primary="活动" sx={{ pl: 1 }} />
          </ListItem>
          {activitiesMenuItems.map((item) => (
            <ListItem
              key={item.path}
              component={Link}
              to={item.path}
              onClick={handleMenuClick}
              sx={{
                pl: 5,
                color: isActiveRoute(item.path) ? "#ff7f50" : "grey",
                backgroundColor: isActiveRoute(item.path)
                  ? "#fff9f0"
                  : "transparent",
                "&:hover": {
                  backgroundColor: "#fff9f0",
                },
              }}
            >
              <ListItemText primary={item.label} sx={{ pl: 1 }} />
            </ListItem>
          ))}

          {/* 移动端：关于我们 */}
          <ListItem
            component={Link}
            to="/about"
            onClick={handleMenuClick}
            sx={{
              color: isActiveRoute("/about") ? "#ff7f50" : "grey",
              backgroundColor: isActiveRoute("/about")
                ? "#fff9f0"
                : "transparent",
              "&:hover": { backgroundColor: "#fff9f0" },
              borderLeft: isActiveRoute("/about")
                ? "4px solid #fff9f0"
                : "none",
            }}
          >
            <Info fontSize="small" />
            <ListItemText primary="关于我们" sx={{ pl: 1 }} />
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );

  const userMenuOpen = Boolean(userMenuAnchor);

  return (
    <AppBar
      position="sticky"
      elevation={1}
      sx={{ backgroundColor: "white", color: "var(--text)" }}
    >
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
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
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              color: "inherit",
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
                  fontWeight: "bold",
                  display: { xs: "none", sm: "block" },
                }}
              >
                启发星球
              </Typography>
              <Typography
                variant="caption"
                sx={{ display: { xs: "none", sm: "block" } }}
              >
                在真实中启发，在连接中发光
              </Typography>
            </div>
          </Link>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          {!isMobile && renderNavLinks()}

          {!isAuthenticated ? (
            <Button
              color="primary"
              variant="contained"
              component={Link}
              to="/login"
              sx={{ ml: 2, backgroundColor: "#ff7f50", boxShadow: "none" }}
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
                sx={{ ml: 2, textTransform: "none", boxShadow: "none" }}
              >
                {userName}
              </Button>
              <Menu
                anchorEl={userMenuAnchor}
                open={userMenuOpen}
                onClose={handleUserMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem
                  component={Link}
                  to="/my-cards"
                  onClick={handleUserMenuClose}
                >
                  <CardMembership fontSize="small" sx={{ mr: 1 }} />
                  我的卡片
                </MenuItem>
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
