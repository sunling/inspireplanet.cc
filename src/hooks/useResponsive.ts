import { useMediaQuery, useTheme } from '@mui/material';

/**
 * 响应式设计自定义Hook
 * 提供各种设备尺寸的检测函数
 */
export const useResponsive = () => {
  const theme = useTheme();

  // 移动端检测 (< 600px)
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 平板设备检测 (600px - 960px)
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // 中等屏幕检测 (< 1280px)
  const isMedium = useMediaQuery(theme.breakpoints.down('md'));

  // 桌面设备检测 (>= 1280px)
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  return {
    theme,
    isMobile,
    isTablet,
    isMedium,
    isDesktop,
  };
};

export default useResponsive;
