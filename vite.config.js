import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    publicDir: 'public',
    // 环境变量配置
    envDir: '.', // 指定.env文件所在目录
    envPrefix: 'VITE_', // 标准Vite环境变量前缀
    // 配置开发服务器
    server: {
      port: 5173,
      // 添加代理配置，转发Netlify Functions请求
      proxy: {
        '/.netlify/functions': {
          target: 'http://localhost:8888',
          changeOrigin: true,
          rewrite: (path) =>
            path.replace(/^\/.netlify\/functions/, '/.netlify/functions'),
        },
      },
    },
    // 移除不必要的process模拟，使用Vite标准的import.meta.env
  };
});
