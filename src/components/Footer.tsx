import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Container, Typography, Divider } from '@mui/material';
import { useResponsive } from '../hooks/useResponsive';

const Footer: React.FC = () => {
  const { isMobile, theme } = useResponsive();

  const footerLinks = [
    { path: '/cover-editor', label: '横版封面制作' },
    { path: '/cover-editor-mobile', label: '竖版封面制作' },
    {
      url: 'https://github.com/sunling/cards.bysunling.com',
      label: 'GitHub',
      isExternal: true,
    },
    { path: '/about', label: '关于我们' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#f5f5f5',
        padding: { xs: 3, md: 4 },
        borderTop: '1px solid rgba(0, 0, 0, 0.1)',
        mt: 8,
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'center', md: 'flex-start' },
            mb: 3,
          }}
        >
          <Box sx={{ mb: { xs: 3, md: 0 } }}>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              © 2025 启发星球
            </Typography>
          </Box>

          <Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1, sm: 2 },
                alignItems: { xs: 'center', sm: 'flex-start' },
              }}
            >
              {footerLinks.map((link, index) => {
                if (link.isExternal) {
                  return (
                    <Box
                      key={index}
                      sx={{ display: 'flex', alignItems: 'center' }}
                    >
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          textDecoration: 'none',
                          color: theme.palette.text.primary,
                          fontSize: isMobile ? '0.85rem' : '0.9rem',
                        }}
                      >
                        {link.label}
                      </a>
                    </Box>
                  );
                }
                return (
                  <Link
                    key={index}
                    to={link.path!}
                    style={{
                      textDecoration: 'none',
                      color: theme.palette.text.primary,
                      fontSize: isMobile ? '0.85rem' : '0.9rem',
                    }}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              textAlign: 'center',
              fontStyle: 'italic',
              fontSize: isMobile ? '0.8rem' : '0.85rem',
            }}
          >
            启发星球 - 点亮彼此的能量场
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
