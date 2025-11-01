import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 创建根元素并渲染应用
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// 渲染应用
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 可选：添加全局错误处理
if (import.meta.env.DEV) {
  console.log('开发环境下运行 React 应用');
}

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
