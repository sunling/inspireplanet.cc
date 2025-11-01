import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import html2canvas from 'html2canvas';

// 导入渐变字体颜色配置
const gradientFontColors: Record<string, string> = {
  'card-gradient-1': 'rgb(107, 33, 168)',
  'card-gradient-2': 'rgb(234, 88, 12)',
  'card-gradient-3': 'rgb(13, 148, 136)',
  'card-gradient-4': 'rgb(79, 70, 229)',
  'card-gradient-5': 'rgb(220, 38, 38)',
};

const getFontColorForGradient = (gradient: string): string => {
  return gradientFontColors[gradient] || 'rgb(0, 0, 0)';
};

// 定义周刊卡片接口
interface WeeklyCard {
  id: string;
  episode: string;
  name: string;
  title: string;
  quote: string;
  detail: string;
  imageUrl?: string;
  gradient: string;
  createdAt: string;
  updatedAt: string;
}

const WeeklyCards: React.FC = () => {
  const [cards, setCards] = useState<WeeklyCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<WeeklyCard[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [episodes, setEpisodes] = useState<string[]>([]);

  // 模拟数据
  const mockWeeklyCards: WeeklyCard[] = [
    {
      id: '1',
      episode: 'EP24',
      name: '张三',
      title: '每周思考：创新与坚持',
      quote: '创新是成功的关键，但坚持才是胜利的保证。',
      detail:
        '本周我们讨论了如何在日常工作中保持创新思维，同时培养坚持不懈的精神。创新能够帮助我们找到新的解决方案，而坚持则能让我们将这些方案变为现实。',
      gradient: 'card-gradient-1',
      createdAt: '2023-10-01T08:00:00Z',
      updatedAt: '2023-10-01T08:00:00Z',
    },
    {
      id: '2',
      episode: 'EP24',
      name: '李四',
      title: '团队协作的力量',
      quote: '一个人可以走得很快，但一群人可以走得更远。',
      detail:
        '团队协作能够汇集不同的想法和技能，创造出超越个人能力的成果。通过有效的沟通和协作，我们能够解决更复杂的问题。',
      gradient: 'card-gradient-2',
      createdAt: '2023-10-01T09:00:00Z',
      updatedAt: '2023-10-01T09:00:00Z',
    },
    {
      id: '3',
      episode: 'EP23',
      name: '王五',
      title: '成长型思维',
      quote: '挑战不是阻碍，而是成长的机会。',
      detail:
        '拥有成长型思维的人相信能力可以通过努力和学习来发展。面对困难时，他们不会轻易放弃，而是将其视为提升自己的机会。',
      gradient: 'card-gradient-3',
      createdAt: '2023-09-24T10:00:00Z',
      updatedAt: '2023-09-24T10:00:00Z',
    },
  ];

  // 加载卡片数据
  useEffect(() => {
    const loadWeeklyCards = async () => {
      try {
        setLoading(true);
        // 模拟API调用延迟
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 使用模拟数据
        setCards(mockWeeklyCards);
        setFilteredCards(mockWeeklyCards);

        // 提取所有唯一的期数
        const uniqueEpisodes = Array.from(
          new Set(mockWeeklyCards.map((card) => card.episode))
        ).sort((a, b) => {
          // 按期数降序排序
          return (
            parseInt(b.replace(/\D/g, '')) - parseInt(a.replace(/\D/g, ''))
          );
        });
        setEpisodes(uniqueEpisodes);
      } catch (error) {
        console.error('加载周刊卡片失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWeeklyCards();
  }, []);

  // 过滤卡片
  useEffect(() => {
    if (selectedEpisode === 'all') {
      setFilteredCards(cards);
    } else {
      setFilteredCards(
        cards.filter((card) => card.episode === selectedEpisode)
      );
    }
  }, [selectedEpisode, cards]);

  // 下载卡片功能
  const handleDownloadCard = async (cardId: string) => {
    try {
      const cardElement = document.getElementById(`card-${cardId}`);
      if (!cardElement) return;

      // 隐藏下载按钮
      const downloadButton = cardElement.querySelector('.download-btn');
      if (downloadButton) {
        (downloadButton as HTMLElement).style.display = 'none';
      }

      // 使用html2canvas捕获卡片
      const canvas = await html2canvas(cardElement, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // 恢复下载按钮显示
      if (downloadButton) {
        (downloadButton as HTMLElement).style.display = 'block';
      }

      // 创建下载链接
      const link = document.createElement('a');
      link.download = `weekly-card-${cardId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('下载卡片失败:', error);
    }
  };

  // 处理期数选择变化
  const handleEpisodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEpisode(e.target.value);
  };

  // 按期数分组卡片
  const groupedCards = filteredCards.reduce(
    (groups: Record<string, WeeklyCard[]>, card) => {
      const episode = card.episode;
      if (!groups[episode]) {
        groups[episode] = [];
      }
      groups[episode].push(card);
      return groups;
    },
    {}
  );

  // 按期数排序
  const sortedEpisodes = Object.keys(groupedCards).sort((a, b) => {
    return parseInt(b.replace(/\D/g, '')) - parseInt(a.replace(/\D/g, ''));
  });

  return (
    <div className="weekly-cards-page">
      <div className="weekly-container">
        {/* 期数过滤器 */}
        <div className="episode-filter">
          <select
            id="episode-filter"
            value={selectedEpisode}
            onChange={handleEpisodeChange}
          >
            <option value="all">所有会议</option>
            {episodes.map((episode) => (
              <option key={episode} value={episode}>
                {episode}
              </option>
            ))}
          </select>
        </div>

        {/* 卡片容器 */}
        <div className="cards-container" id="cards">
          {loading ? (
            <div className="loading-indicator">加载中...</div>
          ) : sortedEpisodes.length === 0 ? (
            <div className="empty-message">暂无卡片数据</div>
          ) : (
            sortedEpisodes.map((episode) => (
              <div key={episode}>
                <h2
                  className="date-heading"
                  id={`episode-${episode.toLowerCase()}`}
                >
                  {episode}
                </h2>
                <div
                  className="date-cards-container"
                  id={`episode-container-${episode.toLowerCase()}`}
                >
                  {groupedCards[episode].map((card) => (
                    <div
                      key={card.id}
                      className="card-container"
                      id={`card-container-${card.id}`}
                    >
                      <div
                        className={`card ${card.gradient}`}
                        id={`card-${card.id}`}
                        style={{
                          color: getFontColorForGradient(card.gradient),
                        }}
                      >
                        <div className="card-body">
                          <div className="title">{card.title}</div>
                          <div
                            className="quote-box"
                            style={{
                              backgroundColor: `${getFontColorForGradient(
                                card.gradient
                              )}10`,
                            }}
                          >
                            {card.quote}
                          </div>
                          <img
                            src={card.imageUrl || '/images/mistyblue.png'}
                            alt={card.title}
                            style={{
                              width: '100%',
                              height: 'auto',
                              borderRadius: '8px',
                            }}
                          />
                          <div
                            className="detail-text"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(card.detail),
                            }}
                          />
                        </div>
                        <div className="card-footer">
                          <div className="footer">— {card.name}</div>
                          <div className="date">
                            {new Date(card.createdAt).toLocaleDateString(
                              'zh-CN'
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        className="download-btn"
                        onClick={() => handleDownloadCard(card.id)}
                        title="下载卡片"
                      >
                        下载
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 返回首页链接 */}
        <Link to="/" className="back-link">
          返回首页
        </Link>
      </div>
    </div>
  );
};

export default WeeklyCards;
