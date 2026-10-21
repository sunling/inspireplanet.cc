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
            <p style={{ margin: '0 0 1.5rem' }}>
              启发星球由孙玲和李影共同发起。我们一直在做的一件事，是每周留出一段时间，邀请大家聚在一起，分享最近读到、听到、经历过，以及正在思考的事情。
            </p>
            <p style={{ margin: '0 0 1.5rem' }}>
              分享可以从一本书、一段播客、一个生活片段开始，也可以是一个还没有答案的问题。不必等到自己成为专家，或把想法整理得很完整。你觉得有价值的内容，和你为什么在意它，就可以成为一次交流的起点。
            </p>
            <p style={{ margin: '0 0 1.5rem' }}>
              孙玲和李影持续参与和组织，也有越来越多的朋友带来自己的经历与思考。对我们来说，每周认真在场、分享和倾听，是这件事最重要的部分。
            </p>
            <p style={{ margin: 0 }}>
              我们也在尝试把交流整理成文字、音频和视频，让没能到场的人也有机会接触这些内容。这些尝试还在摸索中，欢迎你一起参与，让有价值的对话被更多人看到、听到。
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
              记录和整理有价值的对话，让启发继续传递
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
                title: '每周分享会',
                description: '围绕真实经历、学习收获与创作实践展开交流',
              },
              {
                title: '启发周刊',
                description: '沉淀每期活动中的金句、片段与延伸思考',
              },
              {
                title: '活动报名',
                description: '查看近期活动，完成报名并管理自己的参与记录',
              },
              {
                title: '问题圆桌',
                description: '带着真实的问题，一起交换经历和不同的看法',
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
              孙玲和李影是启发星球的共同发起者，也是一直参与和组织的人。每一位愿意分享、倾听、提问和回应的朋友，都在让这里变得更丰富。
            </p>
            <p style={{ margin: 0 }}>
              新的 Logo 保留了两位发起者的身影，也加入了围坐交流的参与者。三个人之间的星光，代表交流中产生的启发；桌前留出的空间，欢迎更多人加入。
            </p>
          </div>

          <div style={{ lineHeight: 1.8, marginBottom: '2rem' }}>
            <h3 style={{ color: '#ff5a36', margin: '0 0 1rem' }}>一起参与</h3>
            <p style={{ margin: '0 0 1rem' }}>
              你可以<a href="/join">加入每周交流</a>，从倾听开始，也可以带来一次分享，或在<a href="/questions">问题圆桌</a>留下你正在思考的问题。
            </p>
            <p style={{ margin: 0 }}>
              <a href="https://github.com/sunling/inspireplanet.cc" target="_blank" rel="noopener noreferrer">站点</a>和<a href="https://github.com/sunling/inspire-planet" target="_blank" rel="noopener noreferrer">内容仓库</a>都是开源的。无论你是在校学生，还是想找一个具体项目练手，都欢迎参与网站优化、文章整理、播客剪辑、视频制作，或提出让内容更容易被看见的想法。
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
                  wordBreak: 'break-all',
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
