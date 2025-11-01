import React from 'react';

const About: React.FC = () => {
  return (
    <div className="about-container">
      <div className="about-header">
        <h1 className="about-title">关于启发星球</h1>
        <p className="about-subtitle">在真实中启发，在连接中发光</p>
      </div>

      <div className="about-section">
        <h2 className="section-title">我们的故事</h2>
        <div className="about-content">
          <p>
            启发星球诞生于对生活中闪光时刻的珍视。我们相信，每个人都有值得分享的启发和感悟，这些瞬间可能来自一本书、一段对话、一次经历，或者是日常生活中的细微观察。
          </p>
          <p>
            我们创建了这个平台，让每个人都能记录和分享这些珍贵的启发时刻，通过精美的卡片形式将思想具象化，让智慧在传递中产生更大的价值。
          </p>
        </div>
      </div>

      <div className="about-section">
        <h2 className="section-title">我们的使命</h2>
        <div className="about-content">
          <p>启发星球致力于：</p>
          <ul>
            <li>创造一个分享智慧和感悟的开放社区</li>
            <li>鼓励深度思考和有意义的交流</li>
            <li>通过美学设计，让思想传递更加生动有力</li>
            <li>连接志同道合的人，共同成长</li>
          </ul>
        </div>
      </div>

      <div className="about-section">
        <h2 className="section-title">平台特色</h2>
        <div className="about-content">
          <div className="feature-list">
            <div className="feature-item">
              <h3 className="feature-title">精美卡片创作</h3>
              <p>使用多种渐变背景、字体和布局，创作独具个性的启发卡片</p>
            </div>
            <div className="feature-item">
              <h3 className="feature-title">卡片广场</h3>
              <p>浏览来自全球用户的启发卡片，获取新的思考角度</p>
            </div>
            <div className="feature-item">
              <h3 className="feature-title">个人收藏</h3>
              <p>管理和整理您创作的所有卡片，记录思想成长轨迹</p>
            </div>
            <div className="feature-item">
              <h3 className="feature-title">启发星球周刊</h3>
              <p>定期精选最具启发性的内容，以周刊形式呈现</p>
            </div>
          </div>
        </div>
      </div>

      <div className="about-section team-section">
        <h2 className="section-title">关于团队</h2>
        <div className="about-content">
          <p>
            启发星球由一群热爱思考和分享的创作者组成。我们来自不同的背景和领域，但都有着共同的愿景：创造一个让思想自由流动的空间。
          </p>
          <p>
            我们相信，每个人都是独特的星球，拥有自己的引力场和光芒。当这些星球相互连接，就会形成一个更加璀璨的星系。
          </p>
          <div className="contact-info">
            <p>如果您有任何问题、建议或合作意向，欢迎联系我们：</p>
            <p>
              <strong>邮箱：</strong>
              孙玲：sunling621@gmail.com，李影：yl4420@columbia.edu
            </p>
            <p>
              <strong>GitHub：</strong>
              <a
                href="https://github.com/sunling/inspireplanet.cc"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://github.com/sunling/inspireplanet.cc
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
