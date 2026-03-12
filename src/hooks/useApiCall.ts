import { useState, useCallback } from 'react';
import { react } from '@/utils/helpers';

export interface UseApiCallOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export interface UseApiCallReturn<T> {
  loading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<T | undefined>;
  reset: () => void;
}

/**
 * 自定义Hook，用于封装API调用和加载状态管理
 * @param apiFn API函数
 * @param options 配置选项
 * @returns 包含loading、error、execute和reset的对象
 */
export const useApiCall = <T = any>(
  apiFn: (...args: any[]) => Promise<{ success: boolean; data?: T; error?: string }>,
  options: UseApiCallOptions = {}
): UseApiCallReturn<T> => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: any[]): Promise<T | undefined> => {
      const wrappedFn = react.withLoading(
        async () => {
          const response = await apiFn(...args);
          react.handleApiResponse(
            response,
            (data) => {
              if (options.onSuccess) options.onSuccess(data);
              return data;
            },
            (err) => {
              if (options.onError) options.onError(err);
              throw new Error(err);
            }
          );
        },
        setLoading,
        setError
      );

      try {
        return await wrappedFn();
      } catch (err) {
        return undefined;
      }
    },
    [apiFn, options]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    execute,
    reset,
  };
};

export default useApiCall;
