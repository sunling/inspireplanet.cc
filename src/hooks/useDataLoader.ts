import { useState, useEffect, useCallback } from 'react';
import { react } from '@/utils/helpers';
import { handleApiResponse } from '../utils/ajax';

export interface UseDataLoaderOptions {
  immediate?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export interface UseDataLoaderReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setData: (data: T | null) => void;
}

/**
 * 自定义Hook，用于封装数据加载逻辑
 * @param fetchFn 数据获取函数
 * @param options 配置选项
 * @returns 包含data、loading、error、reload和setData的对象
 */
export const useDataLoader = <T = any>(
  fetchFn: () => Promise<{ success: boolean; data?: T; error?: string }>,
  options: UseDataLoaderOptions = {}
): UseDataLoaderReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const wrappedFn = react.withLoading(
      async () => {
        const response = await fetchFn();
        handleApiResponse(
          response,
          (responseData) => {
            setData(responseData);
            if (options.onSuccess) options.onSuccess(responseData);
          },
          (err) => {
            if (options.onError) options.onError(err);
          }
        );
      },
      setLoading,
      setError
    );

    await wrappedFn();
  }, [fetchFn, options]);

  useEffect(() => {
    if (options.immediate !== false) {
      loadData();
    }
  }, [options.immediate, loadData]);

  return {
    data,
    loading,
    error,
    reload: loadData,
    setData,
  };
};

export default useDataLoader;
