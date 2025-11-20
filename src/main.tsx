import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import routes from './routes';
import { AppProvider } from './context/app'; // 导入AppProvider

// 创建根元素并渲染应用
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// 渲染应用
root.render(
  <React.StrictMode>
    {/* 包裹AppProvider，提供全局Context */}
    <AppProvider>
      <RouterProvider router={routes} />
    </AppProvider>
  </React.StrictMode>
);

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
  // 这里可以添加错误上报逻辑
});

// Promise 未捕获错误处理
window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的 Promise 错误:', event.reason);
  // 这里可以添加错误上报逻辑
});
