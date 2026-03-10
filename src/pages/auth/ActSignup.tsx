import React, { useState } from 'react';

import {
  Box,
  Container,
  Typography,
  TextField,
  FormControlLabel,
  Radio,
  RadioGroup,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { workshopApi } from '@/netlify/config';

// 创建自定义主题
const theme = createTheme({
  palette: {
    primary: {
      main: '#ff7f50',
    },
    secondary: {
      main: '#ff7f50',
    },
    background: {
      default: '#f8f9fa',
      paper: 'white',
    },
    text: {
      primary: 'var(--text)',
      secondary: 'var(--text-light)',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '1rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
          },
        },
      },
    },
  },
});

const ActSignup: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    wechat: '',
    why: '',
    expectation: '',
    paid: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      paid: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // 使用统一的api对象提交报名信息
      // todo:修正类型
      const response = await workshopApi.register(formData as any);

      if (response.success) {
        setSubmissionSuccess(true);
      } else {
        setError(response.error || '未知错误，请稍后再试或联系管理员');
      }
    } catch (error) {
      console.error('提交错误：', error);
      setError('提交时发生错误，请稍后再试或联系管理员');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 成功页面
  if (submissionSuccess) {
    return (
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            minHeight: '100vh',
            bgcolor: 'background.default',
            py: 4,
            px: 2,
          }}
        >
          <Container maxWidth="md">
            <Box
              sx={{
                textAlign: 'center',
                p: 4,
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 1,
              }}
            >
              <Typography
                variant="h4"
                component="h2"
                gutterBottom
                sx={{ color: 'primary.main', mb: 4 }}
              >
                🎉 报名成功！
              </Typography>
              <Typography variant="h6" paragraph>
                感谢你的报名！请添加我的微信，我会尽快联系你并邀请进群。
              </Typography>

              <Box
                sx={{
                  bgcolor: '#f8f9fa',
                  p: 4,
                  borderRadius: 1,
                  mx: 'auto',
                  maxWidth: 400,
                  border: '1px solid #e9ecef',
                  my: 4,
                }}
              >
                <Typography variant="h6" gutterBottom>
                  📱 添加微信
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                  <img
                    src="/images/wechat-sl.jpg"
                    alt="孙玲微信二维码"
                    style={{ maxWidth: 200, borderRadius: 8 }}
                  />
                </Box>
                <Typography
                  variant="h6"
                  sx={{ color: 'primary.main', fontWeight: 'bold', mt: 2 }}
                >
                  ⚠️ 请备注：ACT
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', mt: 1 }}
                >
                  这样我能快速识别你是工作坊学员
                </Typography>
              </Box>

              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', mt: 4 }}
              >
                我会在1天内联系你，邀请进群 🌿
              </Typography>
            </Box>
          </Container>
        </Box>
      </ThemeProvider>
    );
  }

  // 主表单页面
  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          py: { xs: 3, md: 6 },
          px: 2,
        }}
      >
        <Container maxWidth="md">
          <Box
            sx={{
              bgcolor: 'background.paper',
              p: { xs: 3, md: 4 },
              borderRadius: 2,
              boxShadow: 1,
              border: '1px solid rgba(255, 127, 80, 0.05)',
            }}
          >
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              sx={{ color: 'primary.main' }}
            >
              🚀 AI × Coding × Thinking 工作坊 · 招募
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{ fontSize: { xs: '1rem', md: '1.1rem' } }}
            >
              不会写代码，但想亲手做一个每天自动更新的"智能信息网站"？
              <br />
              来加入我们的 4 节课的线上工作坊，一起把 AI × Coding × Thinking
              结合起来，把想法变成真实作品。
            </Typography>
            <Typography variant="body1" paragraph>
              你将在 4 次课完成这一条完整链路：
            </Typography>
            <Typography variant="body1" paragraph sx={{ fontWeight: 500 }}>
              📅{' '}
              <strong>
                时间：每周日中午12点（北京时间），2025年9月14日开始
              </strong>
              4 节课，每周一次，每次约 60~90 分钟
              <br />
              👩‍💻 <strong>形式：</strong>线上，边学边做
              <br />
              💰 <strong>课程费用：</strong>199 元<br />
              👉 如果你确实有经济上的困难，也可以发邮件 sunling621@gmail.com
              跟我说，我们会想办法一起解决。
            </Typography>

            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              sx={{ color: 'primary.main', mt: 4 }}
            >
              四节课程安排
            </Typography>

            <Box
              sx={{
                display: 'flex',
                flexWrap: { xs: 'wrap', md: 'nowrap' },
                gap: { xs: 2, md: 1 },
                my: 4,
                justifyContent: { xs: 'stretch', md: 'space-between' },
              }}
            >
              {[
                {
                  title: '第 1 课：上线你的第一个网站',
                  desc: '一键部署，网站即刻展示孙玲精选的信息源内容（高质量文章与金句）。',
                },
                {
                  title: '第 2 课：让网站更好用',
                  desc: '调整文字与提示、优化交互、个性化样式，增加信息源搜索功能。',
                },
                {
                  title: '第 3 课：学会信息分类',
                  desc: '设计标签与信息架构，支持搜索、筛选、排序。',
                },
                {
                  title: '第 4 课：让 AI 帮你工作',
                  desc: '配置你关注的信息源，网站每天自动更新；AI 负责分析/整理/总结/翻译。',
                },
              ].map((week, index) => (
                <Card
                  key={index}
                  sx={{
                    flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 16px)', md: 1 },
                    minWidth: { xs: '100%', sm: 'calc(50% - 16px)', md: 130 },
                    borderLeft: '4px solid #ff7f50',
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Typography
                      variant="h6"
                      component="h3"
                      gutterBottom
                      sx={{
                        color: 'text.primary',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                      }}
                    >
                      {week.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        fontSize: { xs: '0.9rem', md: '0.95rem' },
                      }}
                    >
                      {week.desc}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Box
              sx={{
                bgcolor: 'background.default',
                p: 3,
                borderRadius: 1,
                my: 4,
                borderLeft: '4px solid #ff7f50',
              }}
            >
              <Typography
                variant="h6"
                component="h3"
                gutterBottom
                sx={{ color: 'primary.main', fontWeight: 600, mt: 0 }}
              >
                🎁 完成后你将拥有：
              </Typography>
              <Typography variant="body1">
                一个能自动更新、基于孙玲精选信息源的在线信息平台（可直接分享访问），帮助你从多个角度深入思考感兴趣的主题，主动获取和深度阅读高质量内容，解决信息获取碎片化和缺乏深度思考的问题。同时获得把
                AI × Coding × Thinking 融合应用的实战体验。
              </Typography>
            </Box>

            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              sx={{ color: 'primary.main', mt: 4 }}
            >
              报名信息
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="你的名字"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                margin="normal"
                variant="outlined"
              />

              <TextField
                fullWidth
                label="微信号"
                name="wechat"
                value={formData.wechat}
                onChange={handleChange}
                required
                margin="normal"
                variant="outlined"
              />

              <TextField
                fullWidth
                label="为什么想报名？"
                name="why"
                value={formData.why}
                onChange={handleChange}
                required
                margin="normal"
                variant="outlined"
                multiline
                rows={3}
              />

              <TextField
                fullWidth
                label="对这个 Workshop 的期待"
                name="expectation"
                value={formData.expectation}
                onChange={handleChange}
                required
                margin="normal"
                variant="outlined"
                multiline
                rows={3}
              />

              <Box
                sx={{
                  textAlign: 'center',
                  my: 4,
                  p: 3,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  border: '1px dashed rgba(255, 127, 80, 0.2)',
                }}
              >
                <Typography variant="body1" gutterBottom>
                  扫码支付报名
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <img
                    src="/images/wechatpay-sl.png"
                    alt="支付二维码"
                    width="150"
                    style={{ borderRadius: 8, transition: 'transform 0.3s' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  />
                </Box>
              </Box>

              <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
                是否已支付？
                <Typography
                  variant="caption"
                  display="block"
                  color="text.secondary"
                >
                  如果费用上有问题并真的很想报名，可以发邮件给我sunling621@gmail.com
                </Typography>
              </Typography>

              <RadioGroup
                row
                name="paid"
                value={formData.paid}
                onChange={handleRadioChange}
                sx={{ my: 2, gap: 4 }}
              >
                <FormControlLabel value="true" control={<Radio />} label="是" />
                <FormControlLabel
                  value="false"
                  control={<Radio />}
                  label="否"
                />
              </RadioGroup>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                disabled={isSubmitting}
                sx={{
                  mt: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  background:
                    'linear-gradient(45deg, #ff7f50 30%, #ff6b4a 90%)',
                  '&:hover': {
                    background:
                      'linear-gradient(45deg, #ff6b4a 30%, #ff5722 90%)',
                    transform: 'translateY(-2px)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                  boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                }}
              >
                {isSubmitting ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                    }}
                  >
                    <CircularProgress size={20} color="inherit" />
                    提交中...
                  </Box>
                ) : (
                  '提交报名信息'
                )}
              </Button>
            </form>

            <Box
              sx={{
                textAlign: 'center',
                mt: 6,
                color: 'text.secondary',
                py: 3,
                borderTop: '1px solid rgba(255, 127, 80, 0.1)',
                fontSize: '0.9rem',
              }}
            >
              2025 © 孙玲 | AI × Coding × Thinking 工作坊
            </Box>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default ActSignup;
