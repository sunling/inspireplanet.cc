import React, { createContext, useContext, ReactNode } from 'react';
import { EnhancedShowSnackbar } from '@/hooks/useSnackbar';
import useSnackbar from '@/hooks/useSnackbar';

// 定义AppContext的数据结构
interface AppContextType {
  showSnackbar: EnhancedShowSnackbar;
  hideSnackbar: () => void;
}

// 创建Context，设置默认值以避免运行时错误
const createDefaultShowSnackbar = (): EnhancedShowSnackbar => {
  const defaultFn: any = (options: any) =>
    console.log('Default snackbar:', options);
  defaultFn.info = (message: string) => console.log('Info snackbar:', message);
  defaultFn.success = (message: string) =>
    console.log('Success snackbar:', message);
  defaultFn.error = (message: string) =>
    console.log('Error snackbar:', message);
  defaultFn.warning = (message: string) =>
    console.log('Warning snackbar:', message);
  return defaultFn as EnhancedShowSnackbar;
};

const AppContext = createContext<AppContextType>({
  showSnackbar: createDefaultShowSnackbar(),
  hideSnackbar: () => {},
});

// AppProvider组件属性接口
interface AppProviderProps {
  children: ReactNode;
}

/**
 * AppProvider组件 - 全局状态管理提供者
 * 集成了Snackbar功能，使其在整个应用中可用
 */
export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // 使用Snackbar钩子获取功能
  const { showSnackbar, hideSnackbar, SnackbarComponent } = useSnackbar();

  // Context值
  const contextValue: AppContextType = {
    showSnackbar,
    hideSnackbar,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      {/* 在Provider中渲染Snackbar组件，使其全局可见 */}
      <SnackbarComponent />
    </AppContext.Provider>
  );
};

/**
 * 自定义钩子，用于在组件中访问AppContext
 * @returns AppContext中的功能
 */
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);

  // 开发环境下检查Context是否在Provider内使用
  if (process.env.NODE_ENV === 'development' && !context) {
    throw new Error('useApp must be used within an AppProvider');
  }

  return context;
};

// 创建一个便捷钩子，仅获取showSnackbar功能
export const useGlobalSnackbar = (): EnhancedShowSnackbar => {
  const { showSnackbar } = useApp();
  return showSnackbar;
};

export default AppContext;
