import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  Grid,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Link as RouterLink } from 'react-router-dom';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const Contact: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
      // 在实际应用中，这里应该发送表单数据到服务器
      await fetch('/.netlify/functions/sendEmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('表单数据:', formData);

      // 显示成功消息
      setShowSuccess(true);

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
        <Card
          sx={{
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
            animation: 'fadeIn 1s ease',
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
              <Typography
                variant={isMobile ? 'h4' : 'h3'}
                sx={{
                  fontWeight: 600,
                  mb: 1,
                  color: '#ff7f50',
                  fontFamily: 'var(--font-serif, serif)',
                }}
              >
                联系我们
              </Typography>
              <Typography variant="h6" sx={{ color: '#666' }}>
                我们期待听到您的声音
              </Typography>
            </Box>

            <Box sx={{ mb: { xs: 5, md: 8 } }}>
              <Typography
                variant={isMobile ? 'h5' : 'h4'}
                sx={{
                  color: '#333',
                  mb: 3,
                  pb: 2,
                  borderBottom: '2px solid #ffefea',
                }}
              >
                给我们留言
              </Typography>

              <Typography
                variant="body1"
                sx={{ mb: 4, lineHeight: 1.8, color: '#555' }}
              >
                无论您有问题、建议、反馈还是合作意向，都欢迎通过以下表单与我们联系。我们会尽快回复您！
              </Typography>

              {showSuccess && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  您的消息已成功发送！我们会尽快回复您。
                </Alert>
              )}

              {showError && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  发送失败，请稍后再试或通过其他方式联系我们。
                </Alert>
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
                      发送留言
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Box>

            <Box>
              <Typography
                variant={isMobile ? 'h5' : 'h4'}
                sx={{
                  color: '#333',
                  mb: 3,
                  pb: 2,
                  borderBottom: '2px solid #ffefea',
                }}
              >
                其他联系方式
              </Typography>

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
                  <Card
                    sx={{
                      bgcolor: '#f9f9f9',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ color: '#ff7f50', mb: 2 }}>
                        电子邮箱
                      </Typography>
                      <Typography variant="body1">
                        contact@bysunling.com
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card
                    sx={{
                      bgcolor: '#f9f9f9',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ color: '#ff7f50', mb: 2 }}>
                        GitHub
                      </Typography>
                      <Typography variant="body1">
                        <RouterLink
                          to="https://github.com/sunling/inspireplanet.cc"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#ff7f50', textDecoration: 'none' }}
                        >
                          cards.bysunling.com
                        </RouterLink>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Card sx={{ bgcolor: '#ffefea' }}>
                <CardContent>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    <strong>响应时间：</strong>
                    我们通常会在1-2个工作日内回复您的留言。如果是紧急事项，建议通过电子邮箱直接联系我们。
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </CardContent>
        </Card>
      </Container>

      <Footer />
    </Box>
  );
};

export default Contact;
