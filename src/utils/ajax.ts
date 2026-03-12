/**
 * 处理API响应
 * @param response API响应对象
 * @param onSuccess 成功回调
 * @param onError 失败回调
 * @returns boolean 是否成功
 */
export const handleApiResponse = <T = any>(
  response: { success: boolean; data?: T; error?: string },
  onSuccess?: (data: T) => void,
  onError?: (error: string) => void
): boolean => {
  if (response.success) {
    if (onSuccess) onSuccess(response.data as T);
    return true;
  } else {
    if (onError) onError(response.error || '操作失败');
    return false;
  }
};

/**
 * 创建异步加载函数
 * @param asyncFn 异步函数
 * @param setLoading 设置加载状态的函数
 * @param setError 设置错误状态的函数
 * @returns 包装后的异步函数
 */
export const withLoading = <T extends any[]>(
  asyncFn: (...args: T) => Promise<any>,
  setLoading: (loading: boolean) => void,
  setError?: (error: string | null) => void
) => {
  return async (...args: T) => {
    try {
      setLoading(true);
      if (setError) setError(null);
      return await asyncFn(...args);
    } catch (error: any) {
      const errorMessage = error?.message || '操作失败，请稍后再试';
      if (setError) setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };
};
