import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Link,
  useMediaQuery,
  useTheme,
} from '@mui/material';

const About: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMedium = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: 8,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="md">
        <Box
          sx={{
            textAlign: 'center',
            mb: 10,
            color: 'white',
          }}
        >
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 'bold',
              mb: 3,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            关于启发星球
          </Typography>
          <Typography
            variant="h5"
            sx={{
              opacity: 0.9,
              fontStyle: 'italic',
            }}
          >
            在真实中启发，在连接中发光
          </Typography>
        </Box>

        <Paper
          elevation={3}
          sx={{
            p: 5,
            mb: 6,
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography
            variant="h4"
            component="h2"
            sx={{
              mb: 4,
              color: '#667eea',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            我们的故事
          </Typography>
          <Box sx={{ lineHeight: 1.8 }}>
            <Typography variant="body1" sx={{ mb: 3 }}>
              启发星球诞生于对生活中闪光时刻的珍视。我们相信，每个人都有值得分享的启发和感悟，这些瞬间可能来自一本书、一段对话、一次经历，或者是日常生活中的细微观察。
            </Typography>
            <Typography variant="body1">
              我们创建了这个平台，让每个人都能记录和分享这些珍贵的启发时刻，通过精美的卡片形式将思想具象化，让智慧在传递中产生更大的价值。
            </Typography>
          </Box>
        </Paper>

        <Paper
          elevation={3}
          sx={{
            p: 5,
            mb: 6,
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography
            variant="h4"
            component="h2"
            sx={{
              mb: 4,
              color: '#667eea',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            我们的使命
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            启发星球致力于：
          </Typography>
          <Box sx={{ pl: 4, mb: 2 }}>
            <Typography
              variant="body1"
              sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}
            >
              <span style={{ color: '#667eea', fontWeight: 'bold' }}>•</span>
              创造一个分享智慧和感悟的开放社区
            </Typography>
            <Typography
              variant="body1"
              sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}
            >
              <span style={{ color: '#667eea', fontWeight: 'bold' }}>•</span>
              鼓励深度思考和有意义的交流
            </Typography>
            <Typography
              variant="body1"
              sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}
            >
              <span style={{ color: '#667eea', fontWeight: 'bold' }}>•</span>
              通过美学设计，让思想传递更加生动有力
            </Typography>
            <Typography
              variant="body1"
              sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
            >
              <span style={{ color: '#667eea', fontWeight: 'bold' }}>•</span>
              连接志同道合的人，共同成长
            </Typography>
          </Box>
        </Paper>

        <Paper
          elevation={3}
          sx={{
            p: 5,
            mb: 6,
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography
            variant="h4"
            component="h2"
            sx={{
              mb: 4,
              color: '#667eea',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            平台特色
          </Typography>
          <Grid container spacing={3}>
            {[
              {
                title: '精美卡片创作',
                description:
                  '使用多种渐变背景、字体和布局，创作独具个性的启发卡片',
              },
              {
                title: '卡片广场',
                description: '浏览来自全球用户的启发卡片，获取新的思考角度',
              },
              {
                title: '个人收藏',
                description: '管理和整理您创作的所有卡片，记录思想成长轨迹',
              },
              {
                title: '启发星球周刊',
                description: '定期精选最具启发性的内容，以周刊形式呈现',
              },
            ].map((feature, index) => (
              <Grid size={{ xs: 12, sm: 6 }} key={index}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 3,
                    height: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      transition: 'transform 0.3s ease',
                    },
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      mb: 2,
                      color: '#667eea',
                      fontWeight: 'bold',
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>

        <Paper
          elevation={3}
          sx={{
            p: 5,
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography
            variant="h4"
            component="h2"
            sx={{
              mb: 4,
              color: '#667eea',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            关于团队
          </Typography>
          <Box sx={{ lineHeight: 1.8, mb: 4 }}>
            <Typography variant="body1" sx={{ mb: 3 }}>
              启发星球由一群热爱思考和分享的创作者组成。我们来自不同的背景和领域，但都有着共同的愿景：创造一个让思想自由流动的空间。
            </Typography>
            <Typography variant="body1">
              我们相信，每个人都是独特的星球，拥有自己的引力场和光芒。当这些星球相互连接，就会形成一个更加璀璨的星系。
            </Typography>
          </Box>

          <Box
            sx={{
              p: 3,
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              borderRadius: '8px',
              borderLeft: '4px solid #667eea',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, color: '#667eea' }}>
              联系方式
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              如果您有任何问题、建议或合作意向，欢迎联系我们：
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>邮箱：</strong>
              孙玲：sunling621@gmail.com，李影：yl4420@columbia.edu
            </Typography>
            <Typography variant="body1">
              <strong>GitHub：</strong>
              <Link
                href="https://github.com/sunling/inspireplanet.cc"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: '#667eea',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                https://github.com/sunling/inspireplanet.cc
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default About;
