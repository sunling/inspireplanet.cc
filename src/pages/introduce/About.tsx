import React from 'react';
import { Container, Grid } from '@mui/material';
import useResponsive from '@/hooks/useResponsive';

const About: React.FC = () => {
  const { isMobile } = useResponsive();

  return (
    <div
      style={{
        minHeight: '100vh',
        paddingTop: '2rem',
        paddingBottom: '2rem',
        background: '#fff9f0',
      }}
    >
      <Container maxWidth="md">
        <header
          style={{
            textAlign: 'center',
            marginBottom: '1rem',
            color: '#ff7f50',
          }}
        >
          <h2
            style={{
              fontWeight: 'bold',
              marginBottom: '1rem',
              fontSize: isMobile ? '2rem' : '2.5rem',
            }}
          >
            关于启发星球
          </h2>
          <p
            style={{
              opacity: 0.9,
              fontStyle: 'italic',
              color: '#666666',
              fontSize: isMobile ? '1.125rem' : '1.5rem',
              margin: 0,
            }}
          >
            在真实中启发，在连接中发光
          </p>
        </header>

        <section
          style={{
            padding: '2.5rem',
            marginBottom: '2.5rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <h2
            style={{
              marginBottom: '2rem',
              color: '#ff5a36',
              fontWeight: 'bold',
              textAlign: 'center',
              fontSize: isMobile ? '1.75rem' : '2rem',
            }}
          >
            我们的故事
          </h2>
          <div style={{ lineHeight: 1.8 }}>
            <p style={{ marginBottom: '1.5rem', margin: 0 }}>
              启发星球诞生于对生活中闪光时刻的珍视。我们相信，每个人都值得分享的启发和感悟，这些瞬间可能来自一本书、一段对话、一次经历，或者是日常生活中的细微观察。
            </p>
            <p style={{ margin: 0 }}>
              我们创建了这个平台，让每个人都能记录和分享这些珍贵的启发时刻，通过精美的卡片形式将思想具象化，让智慧在传递中产生更大的价值。
            </p>
          </div>
        </section>

        <section
          style={{
            padding: '2.5rem',
            marginBottom: '2.5rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <h2
            style={{
              marginBottom: '2rem',
              color: '#ff5a36',
              fontWeight: 'bold',
              textAlign: 'center',
              fontSize: isMobile ? '1.75rem' : '2rem',
            }}
          >
            我们的使命
          </h2>
          <p style={{ marginBottom: '1.5rem', margin: 0 }}>启发星球致力于：</p>
          <ul style={{ paddingLeft: '2rem', marginBottom: '1rem' }}>
            <li
              style={{
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ color: '#ff5a36', fontWeight: 'bold' }}>•</span>
              创造一个分享智慧和感悟的开放社区
            </li>
            <li
              style={{
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ color: '#ff5a36', fontWeight: 'bold' }}>•</span>
              鼓励深度思考和有意义的交流
            </li>
            <li
              style={{
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ color: '#ff5a36', fontWeight: 'bold' }}>•</span>
              通过美学设计，让思想传递更加生动有力
            </li>
            <li
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span style={{ color: '#ff5a36', fontWeight: 'bold' }}>•</span>
              连接志同道合的人，共同成长
            </li>
          </ul>
        </section>

        <section
          style={{
            padding: '2.5rem',
            marginBottom: '2.5rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <h2
            style={{
              marginBottom: '2rem',
              color: '#ff5a36',
              fontWeight: 'bold',
              textAlign: 'center',
              fontSize: isMobile ? '1.75rem' : '2rem',
            }}
          >
            平台特色
          </h2>
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
                <article
                  style={{
                    padding: '1.5rem',
                    height: '90%',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.05)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow =
                      '0 6px 16px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow =
                      '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                >
                  <h3
                    style={{
                      marginBottom: '1rem',
                      color: '#ff5a36',
                      fontWeight: 'bold',
                      fontSize: '1.25rem',
                      margin: 0,
                    }}
                  >
                    {feature.title}
                  </h3>
                  <p style={{ margin: 0, color: '#666', lineHeight: 1.6 }}>
                    {feature.description}
                  </p>
                </article>
              </Grid>
            ))}
          </Grid>
        </section>

        <section
          style={{
            padding: '2.5rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <h2
            style={{
              marginBottom: '2rem',
              color: '#ff5a36',
              fontWeight: 'bold',
              textAlign: 'center',
              fontSize: isMobile ? '1.75rem' : '2rem',
            }}
          >
            关于团队
          </h2>
          <div style={{ lineHeight: 1.8, marginBottom: '2rem' }}>
            <p style={{ marginBottom: '1.5rem', margin: 0 }}>
              启发星球由一群热爱思考和分享的创作者组成。我们来自不同的背景和领域，但都有着共同的愿景：创造一个让思想自由流动的空间。
            </p>
            <p style={{ margin: 0 }}>
              我们相信，每个人都是独特的星球，拥有自己的引力场和光芒。当这些星球相互连接，就会形成一个更加璀璨的星系。
            </p>
          </div>

          <aside
            style={{
              padding: '1.5rem',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              borderRadius: '8px',
              borderLeft: '4px solid #ff5a36',
            }}
          >
            <h3
              style={{
                marginBottom: '1rem',
                color: '#ff5a36',
                fontWeight: 'bold',
                fontSize: '1.25rem',
                margin: 0,
              }}
            >
              联系方式
            </h3>
            <p style={{ marginBottom: '1rem', margin: 0 }}>
              如果您有任何问题、建议或合作意向，欢迎联系我们：
            </p>
            <p style={{ marginBottom: '1rem', margin: 0 }}>
              <strong>邮箱：</strong>
              孙玲：sunling621@gmail.com，李影：yl4420@columbia.edu
            </p>
            <p style={{ margin: 0 }}>
              <strong>GitHub：</strong>
              <a
                href="https://github.com/sunling/inspireplanet.cc"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#ff5a36',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.textDecoration = 'underline')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.textDecoration = 'none')
                }
              >
                https://github.com/sunling/inspireplanet.cc
              </a>
            </p>
          </aside>
        </section>
      </Container>
    </div>
  );
};

export default About;
