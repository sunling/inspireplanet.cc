import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// 环境变量类型定义
type EnvVars = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};

// 获取环境变量，同时支持客户端和服务端环境
function getEnvVars(): EnvVars {
  try {
    // 首先尝试服务端环境变量（Netlify Functions）
    if (typeof process !== 'undefined' && process.env) {
      const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
      // 在服务端优先使用服务角色密钥（不受RLS限制）
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
      return {
        SUPABASE_URL: url,
        SUPABASE_ANON_KEY: serviceKey || anonKey,
      };
    }

    // 然后尝试客户端环境变量（Vite）
    if (typeof import.meta !== 'undefined') {
      const metaEnv = (import.meta as any).env;
      if (metaEnv) {
        return {
          SUPABASE_URL: metaEnv.VITE_SUPABASE_URL || '',
          SUPABASE_ANON_KEY: metaEnv.VITE_SUPABASE_ANON_KEY || '',
        };
      }
    }

    // 兜底方案
    console.error('获取环境变量出错！');
    return {
      SUPABASE_URL: '',
      SUPABASE_ANON_KEY: '',
    };
  } catch (error) {
    console.error('获取环境变量出错:', error);
    return {
      SUPABASE_URL: '',
      SUPABASE_ANON_KEY: '',
    };
  }
}

// Supabase客户端单例类
class SupabaseClientSingleton {
  private static instance: SupabaseClient | null = null;

  private constructor() {}

  public static getInstance(): SupabaseClient {
    if (!SupabaseClientSingleton.instance) {
      const env = getEnvVars();

      if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
        console.error(
          'Supabase环境变量未正确配置，请检查.env文件中的VITE_SUPABASE_URL和VITE_SUPABASE_ANON_KEY'
        );
      }

      SupabaseClientSingleton.instance = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_ANON_KEY
      );
    }

    return SupabaseClientSingleton.instance;
  }
}

// 导出单例实例
export const supabase = SupabaseClientSingleton.getInstance();

// 导出类型
export type { SupabaseClient };
