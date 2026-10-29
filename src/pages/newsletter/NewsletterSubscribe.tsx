import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Container, Link, Typography } from '@mui/material';
import NewsletterSignup from '../../components/NewsletterSignup';

export default function NewsletterSubscribe() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = '订阅每周分享 · 启发星球';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 7 } }}>
      <Typography variant="overline" color="text.secondary">
        启发星球 · 每周分享
      </Typography>
      <Typography
        component="h1"
        variant="h3"
        sx={{
          mt: 1,
          mb: 2,
          fontSize: { xs: '2rem', sm: '2.5rem' },
          fontWeight: 650,
        }}
      >
        把每周的启发，带进收件箱
      </Typography>
      <Typography color="text.secondary" sx={{ lineHeight: 1.9 }}>
        没赶上现场，也可以慢慢读。一封邮件，回顾大家这一周的真实经历、观察和困惑。
      </Typography>
      <Box component="ul" sx={{ pl: 2.5, my: 3, '& li': { mb: 1 } }}>
        <li>本期小结，看看这一次聊到了什么。</li>
        <li>三条真实金句，保留分享者自己的表达。</li>
        <li>已发布的小宇宙播客，想听的时候再听。</li>
        <li>下一期活动邀请：来参与、申请分享，或提交问题场景。</li>
      </Box>
      <Typography variant="body2" color="text.secondary">
        无需注册账号，可随时通过邮件中的链接退订。
      </Typography>
      <NewsletterSignup source="/subscribe" showIntroduction={false} />
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: 'center' }}
      >
        想先了解这里？{' '}
        <Link component={RouterLink} to="/" color="inherit">
          逛逛启发星球
        </Link>
      </Typography>
    </Container>
  );
}
