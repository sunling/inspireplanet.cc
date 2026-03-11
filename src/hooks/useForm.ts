import { useState, useCallback } from 'react';
import { validation } from '@/utils/helpers';

export interface FormField {
  value: string;
  error?: string;
  touched: boolean;
}

export interface FormRules {
  required?: boolean;
  email?: boolean;
  phone?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | undefined;
}

export interface FormConfig<T extends Record<string, any>> {
  initialValues: T;
  rules?: Partial<Record<keyof T, FormRules>>;
  onSubmit: (values: T) => Promise<void> | void;
}

export interface UseFormReturn<T extends Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  loading: boolean;
  isValid: boolean;
  handleChange: (field: keyof T, value: string) => void;
  handleBlur: (field: keyof T) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: () => void;
  setFieldValue: (field: keyof T, value: string) => void;
  setFieldError: (field: keyof T, error: string | undefined) => void;
}

/**
 * 自定义Hook，用于表单状态管理和验证
 * @param config 表单配置
 * @returns 表单状态和方法
 */
export const useForm = <T extends Record<string, any>>(
  config: FormConfig<T>
): UseFormReturn<T> => {
  const [values, setValues] = useState<T>(config.initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [loading, setLoading] = useState(false);

  const validateField = useCallback(
    (field: keyof T, value: string): string | undefined => {
      const rules = config.rules?.[field];
      if (!rules) return undefined;

      if (rules.required && !validation.required(value)) {
        return '此字段为必填项';
      }

      if (rules.email && value && !validation.email(value)) {
        return '请输入有效的邮箱地址';
      }

      if (rules.phone && value && !validation.phone(value)) {
        return '请输入有效的手机号码';
      }

      if (rules.minLength && value.length < rules.minLength) {
        return `最少需要${rules.minLength}个字符`;
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        return `最多允许${rules.maxLength}个字符`;
      }

      if (rules.pattern && value && !rules.pattern.test(value)) {
        return '格式不正确';
      }

      if (rules.custom) {
        return rules.custom(value);
      }

      return undefined;
    },
    [config.rules]
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(values).forEach((key) => {
      const field = key as keyof T;
      const error = validateField(field, values[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validateField]);

  const handleChange = useCallback(
    (field: keyof T, value: string) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      if (touched[field]) {
        const error = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: error }));
      }
    },
    [touched, validateField]
  );

  const handleBlur = useCallback(
    (field: keyof T) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const error = validateField(field, values[field]);
      setErrors((prev) => ({ ...prev, [field]: error }));
    },
    [values, validateField]
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      if (!validateForm()) return;

      setLoading(true);
      try {
        await config.onSubmit(values);
      } finally {
        setLoading(false);
      }
    },
    [values, validateForm, config.onSubmit]
  );

  const reset = useCallback(() => {
    setValues(config.initialValues);
    setErrors({});
    setTouched({});
    setLoading(false);
  }, [config.initialValues]);

  const setFieldValue = useCallback((field: keyof T, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string | undefined) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    loading,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldError,
  };
};

export default useForm;
