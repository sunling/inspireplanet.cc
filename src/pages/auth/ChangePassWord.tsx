import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../netlify/configs';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getCurrentUser } from '@/utils';

interface PasswordRequirements {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
}

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const ChangePassWord: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [passwordStrength, setPasswordStrength] = useState<
    'weak' | 'medium' | 'strong' | null
  >(null);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const [formData, setFormData] = useState<FormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [requirements, setRequirements] = useState<PasswordRequirements>({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  // 检查登录状态
  useEffect(() => {
    setIsLoading(true);
    const token = localStorage.getItem('userToken');
    if (!token) {
      const redirect = `${location.pathname}${location.search}${location.hash}`;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
    }
    setIsLoading(false);
  }, [navigate]);

  // 检查密码强度
  const checkPasswordStrength = (password: string) => {
    const newRequirements: PasswordRequirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
    };

    setRequirements(newRequirements);

    const metCount = Object.values(newRequirements).filter(Boolean).length;

    if (metCount < 2) {
      setPasswordStrength('weak');
    } else if (metCount < 4) {
      setPasswordStrength('medium');
    } else {
      setPasswordStrength('strong');
    }
  };

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // 验证当前密码
    if (!formData.currentPassword) {
      newErrors.currentPassword = '请输入当前密码';
      isValid = false;
    }

    // 验证新密码
    if (!formData.newPassword) {
      newErrors.newPassword = '请输入新密码';
      isValid = false;
    } else if (passwordStrength === 'weak') {
      newErrors.newPassword = '密码强度太弱，请设置更强的密码';
      isValid = false;
    }

    // 验证确认密码
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认新密码';
      isValid = false;
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致';
      isValid = false;
    }

    // 检查新密码是否与当前密码相同
    if (
      formData.currentPassword &&
      formData.newPassword &&
      formData.currentPassword === formData.newPassword
    ) {
      newErrors.newPassword = '新密码不能与当前密码相同';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // 清除对应字段的错误
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    // 实时检查密码强度
    if (name === 'newPassword') {
      checkPasswordStrength(value);
    }
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitLoading(true);
    setMessage(null);

    try {
      const currentUser = getCurrentUser() || {};
      // 使用统一的api对象修改密码
      const response = await api.auth.changePassword({
        email: currentUser?.email || '',
        oldPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      if (response.success) {
        setMessage({
          text: '密码修改成功！即将跳转到用户中心...',
          type: 'success',
        });

        // 2秒后跳转到用户中心
        setTimeout(() => {
          navigate('/profile');
        }, 2000);
      } else {
        setMessage({
          text: response.error || '密码修改失败，请稍后再试',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      setMessage({
        text: '网络错误，请稍后重试',
        type: 'error',
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        isAuthenticated={true}
        userName="用户"
        onLogout={() => {
          const redirect = `${location.pathname}${location.search}${location.hash}`;
          navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
        }}
      />

      <Container
        maxWidth="md"
        sx={{
          flex: 1,
          py: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: 500,
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            borderRadius: 4,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {message && (
              <Alert severity={message.type} sx={{ mb: 3 }}>
                {message.text}
              </Alert>
            )}

            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography
                variant="h4"
                sx={{ fontWeight: 600, mb: 1, color: 'var(--text)' }}
              >
                修改密码
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-light)' }}>
                为了账户安全，请设置一个强密码
              </Typography>
            </Box>

            <form onSubmit={handleSubmit}>
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  label="当前密码"
                  name="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  error={!!errors.currentPassword}
                  helperText={errors.currentPassword}
                  variant="outlined"
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderWidth: '2px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#ff7f50',
                      },
                      '&.Mui-error fieldset': {
                        borderColor: '#dc3545',
                      },
                    },
                  }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  label="新密码"
                  name="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  error={!!errors.newPassword}
                  helperText={errors.newPassword}
                  variant="outlined"
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderWidth: '2px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#ff7f50',
                      },
                      '&.Mui-error fieldset': {
                        borderColor: '#dc3545',
                      },
                    },
                  }}
                />

                {passwordStrength && formData.newPassword && (
                  <Box
                    sx={{
                      mt: 1,
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor:
                        passwordStrength === 'weak'
                          ? '#f8d7da'
                          : passwordStrength === 'medium'
                          ? '#fff3cd'
                          : '#d4edda',
                      color:
                        passwordStrength === 'weak'
                          ? '#721c24'
                          : passwordStrength === 'medium'
                          ? '#856404'
                          : '#155724',
                      fontSize: '0.875rem',
                    }}
                  >
                    密码强度：
                    {passwordStrength === 'weak'
                      ? '弱'
                      : passwordStrength === 'medium'
                      ? '中等'
                      : '强'}
                  </Box>
                )}

                <Box sx={{ mt: 2, bgcolor: '#f8f9fa', p: 2, borderRadius: 1 }}>
                  <PasswordRequirement
                    text="至少8个字符"
                    met={requirements.length}
                  />
                  <PasswordRequirement
                    text="包含大写字母"
                    met={requirements.uppercase}
                  />
                  <PasswordRequirement
                    text="包含小写字母"
                    met={requirements.lowercase}
                  />
                  <PasswordRequirement
                    text="包含数字"
                    met={requirements.number}
                  />
                </Box>
              </Box>

              <Box sx={{ mb: 4 }}>
                <TextField
                  fullWidth
                  label="确认新密码"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  error={!!errors.confirmPassword}
                  helperText={
                    errors.confirmPassword ||
                    (formData.confirmPassword &&
                    formData.newPassword === formData.confirmPassword
                      ? '密码匹配'
                      : '')
                  }
                  variant="outlined"
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderWidth: '2px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#ff7f50',
                      },
                      '&.Mui-error fieldset': {
                        borderColor: '#dc3545',
                      },
                    },
                  }}
                />
              </Box>

              <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={submitLoading || !validateForm()}
                sx={{
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  bgcolor: 'linear-gradient(45deg, #ff7f50 30%, #ff6348 90%)',
                  '&:hover:not(:disabled)': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(255,127,80,0.3)',
                  },
                  '&.Mui-disabled': {
                    opacity: 0.6,
                    cursor: 'not-allowed',
                  },
                }}
              >
                {submitLoading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  '修改密码'
                )}
              </Button>
            </form>

            <Button
              fullWidth
              variant="text"
              onClick={() => navigate('/profile')}
              sx={{
                mt: 3,
                color: 'var(--text-light)',
                '&:hover': {
                  color: '#ff7f50',
                  bgcolor: 'transparent',
                },
              }}
            >
              ← 返回用户中心
            </Button>
          </CardContent>
        </Card>
      </Container>

      <Footer />
    </Box>
  );
};

interface PasswordRequirementProps {
  text: string;
  met: boolean;
}

const PasswordRequirement: React.FC<PasswordRequirementProps> = ({
  text,
  met,
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      mb: 1,
      color: met ? '#28a745' : 'var(--text-light)',
    }}
  >
    <Box
      sx={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        bgcolor: met ? '#28a745' : '#dee2e6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mr: 1,
        color: 'white',
        fontSize: '0.75rem',
      }}
    >
      ✓
    </Box>
    <Typography variant="body2">{text}</Typography>
  </Box>
);

export default ChangePassWord;
