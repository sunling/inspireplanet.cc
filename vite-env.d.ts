/// <reference types="vite/client" />

// 扩展ImportMeta接口，添加env属性
declare interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // 添加其他需要的环境变量
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly BASE_URL: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
