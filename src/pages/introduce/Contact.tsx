import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Grid,
} from '@mui/material';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Link as RouterLink } from 'react-router-dom';
import { api } from '../netlify/configs';
import Error from '../components/Error';
import { useResponsive } from '../hooks/useResponsive';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const Contact: React.FC = () => {
  const { isMobile } = useResponsive();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  // 处理输入变化
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setShowSuccess(false);
    setShowError(false);

    try {
      // 使用统一API封装发送邮件
      const response = await api.contact.sendEmail({
        name: formData.name,
        email: formData.email,
        message: formData.subject + '\n\n' + formData.message,
      });

      // 检查响应是否成功
      if (response.success) {
        // 显示成功消息
        setShowSuccess(true);
      } else {
        throw new Error(response.error || '发送失败');
      }

      // 重置表单
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
      });

      // 5秒后隐藏成功消息
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
    } catch (error) {
      console.error('发送失败:', error);
      setShowError(true);

      // 5秒后隐藏错误消息
      setTimeout(() => {
        setShowError(false);
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#f9f9f9',
      }}
    >
      <Header isAuthenticated={false} userName="" onLogout={() => {}} />

      <Container maxWidth="md" sx={{ flex: 1, py: { xs: 4, md: 8 } }}>
        <article
          style={{
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
            backgroundColor: 'white',
            animation: 'fadeIn 1s ease',
            padding: { xs: '1.5rem', md: '2rem' },
          }}
        >
          <section
            style={{
              textAlign: 'center',
              marginBottom: { xs: '2rem', md: '3rem' },
            }}
          >
            <h1
              style={{
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#ff7f50',
                fontFamily: 'var(--font-serif, serif)',
                fontSize: isMobile ? '1.75rem' : '2.25rem',
              }}
            >
              联系我们
            </h1>
            <p style={{ color: '#666', fontSize: '1.25rem' }}>
              我们期待听到您的声音
            </p>
          </section>

          <section style={{ marginBottom: { xs: '2.5rem', md: '4rem' } }}>
            <h2
              style={{
                color: '#333',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid #ffefea',
                fontSize: isMobile ? '1.5rem' : '2rem',
              }}
            >
              给我们留言
            </h2>

            <Typography
              variant="body1"
              sx={{ mb: 4, lineHeight: 1.8, color: '#555' }}
            >
              无论您有问题、建议、反馈还是合作意向，都欢迎通过以下表单与我们联系。我们会尽快回复您！
            </Typography>

            {showSuccess && (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: '#e8f5e9',
                  color: '#2e7d32',
                  borderLeft: '4px solid #4caf50',
                  marginBottom: '1.5rem',
                  borderRadius: '4px',
                }}
              >
                <strong>发送成功！</strong>{' '}
                您的消息已成功发送，我们会尽快回复您。
              </div>
            )}

            {showError && (
              <Error
                message="发送失败"
                description="请稍后再试或通过其他方式联系我们"
                onRetry={() => {
                  setShowError(false);
                }}
                retryText="关闭"
              />
            )}

            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="您的姓名"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="请输入您的姓名"
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderWidth: '1px',
                        },
                        '&:hover fieldset': {
                          borderColor: '#ff7f50',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#ff7f50',
                          boxShadow: '0 0 0 3px rgba(255, 127, 80, 0.2)',
                        },
                      },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="电子邮箱"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="请输入您的电子邮箱"
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderWidth: '1px',
                        },
                        '&:hover fieldset': {
                          borderColor: '#ff7f50',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#ff7f50',
                          boxShadow: '0 0 0 3px rgba(255, 127, 80, 0.2)',
                        },
                      },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="主题"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    placeholder="请输入消息主题"
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderWidth: '1px',
                        },
                        '&:hover fieldset': {
                          borderColor: '#ff7f50',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#ff7f50',
                          boxShadow: '0 0 0 3px rgba(255, 127, 80, 0.2)',
                        },
                      },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="您的留言"
                    name="message"
                    multiline
                    rows={6}
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    placeholder="请输入您的留言内容"
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderWidth: '1px',
                        },
                        '&:hover fieldset': {
                          borderColor: '#ff7f50',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#ff7f50',
                          boxShadow: '0 0 0 3px rgba(255, 127, 80, 0.2)',
                        },
                      },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Button
                    variant="contained"
                    type="submit"
                    disabled={isSubmitting}
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 500,
                      bgcolor: '#ff7f50',
                      '&:hover:not(:disabled)': {
                        bgcolor: '#ff6348',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(255,127,80,0.3)',
                      },
                    }}
                  >
                    {isSubmitting ? '发送中...' : '发送留言'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </section>

          <section>
            <h2
              style={{
                color: '#333',
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid #ffefea',
                fontSize: isMobile ? '1.5rem' : '2rem',
              }}
            >
              其他联系方式
            </h2>

            <Grid
              container
              spacing={3}
              sx={{
                mb: 4,
                '& .MuiGrid-item': {
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                  },
                },
              }}
            >
              <Grid size={{ xs: 12, sm: 6 }}>
                <div
                  style={{
                    backgroundColor: '#f9f9f9',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    padding: '1.5rem',
                    borderRadius: '8px',
                  }}
                >
                  <h3
                    style={{
                      color: '#ff7f50',
                      marginBottom: '1rem',
                      fontSize: '1.25rem',
                    }}
                  >
                    电子邮箱
                  </h3>
                  <p>contact@bysunling.com</p>
                </div>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <div
                  style={{
                    backgroundColor: '#f9f9f9',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    padding: '1.5rem',
                    borderRadius: '8px',
                  }}
                >
                  <h3
                    style={{
                      color: '#ff7f50',
                      marginBottom: '1rem',
                      fontSize: '1.25rem',
                    }}
                  >
                    GitHub
                  </h3>
                  <p>
                    <RouterLink
                      to="https://github.com/sunling/inspireplanet.cc"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#ff7f50', textDecoration: 'none' }}
                    >
                      cards.bysunling.com
                    </RouterLink>
                  </p>
                </div>
              </Grid>
            </Grid>

            <div
              style={{
                backgroundColor: '#ffefea',
                padding: '1.5rem',
                borderRadius: '8px',
                borderLeft: '4px solid #ff7f50',
              }}
            >
              <p style={{ fontWeight: 500, margin: 0 }}>
                <strong>响应时间：</strong>
                我们通常会在1-2个工作日内回复您的留言。如果是紧急事项，建议通过电子邮箱直接联系我们。
              </p>
            </div>
          </section>
        </article>
      </Container>

      <Footer />
    </Box>
  );
};

export default Contact;
