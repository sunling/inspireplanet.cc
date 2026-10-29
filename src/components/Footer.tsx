import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Container, Typography } from '@mui/material';
import { useResponsive } from '../hooks/useResponsive';

const Footer: React.FC = () => {
  const { isMobile, theme } = useResponsive();
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { path: '/about', label: '关于启发星球' },
    { path: '/subscribe', label: '订阅每周分享' },
    { path: '/join', label: '加入微信群' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        width: '100%',
        zIndex: 1,
        backgroundColor: '#f5f5f5',
        padding: { xs: 1, md: 1 },
        borderTop: '1px solid rgba(0, 0, 0, 0.1)',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'center', md: 'flex-start' },
            mb: 1,
          }}
        >
          <Box
            sx={{
              mb: { xs: 1, md: 0 },
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              © {currentYear} 启发星球
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontStyle: 'italic',
                fontSize: isMobile ? '0.8rem' : '0.85rem',
              }}
            >
              启发星球 - 点亮彼此的能量场
            </Typography>
          </Box>

          <Box>
            <Box
              component="nav"
              aria-label="页脚导航"
              sx={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: { xs: 1, sm: 2 },
                alignItems: { xs: 'center', sm: 'flex-start' },
              }}
            >
              {footerLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{
                    textDecoration: 'none',
                    color: theme.palette.text.primary,
                    fontSize: isMobile ? '0.85rem' : '0.9rem',
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
