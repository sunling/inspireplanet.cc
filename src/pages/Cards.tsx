import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';

// 导入渐变字体颜色配置
const gradientFontColors: Record<string, string> = {
  'card-gradient-1': '#2c3e50',
  'card-gradient-2': '#2c3e50',
  'card-gradient-3': '#2c3e50',
  'card-gradient-4': '#2c3e50',
  'card-gradient-5': '#ffffff',
  'card-gradient-6': '#ffffff',
  'card-gradient-7': '#ffffff',
  'card-gradient-8': '#ffffff',
  'card-gradient-9': '#ffffff',
  'card-gradient-10': '#ffffff',
};

// 获取渐变对应的字体颜色
const getFontColorForGradient = (gradientClass: string): string => {
  return gradientFontColors[gradientClass] || '#2c3e50';
};

// 定义卡片接口
interface Card {
  id: string;
  Title: string;
  Quote: string;
  Detail?: string;
  ImagePath?: string;
  Creator?: string;
  Created: string;
  Font?: string;
  gradient?: string;
}

const Cards: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedCards, setGroupedCards] = useState<Record<string, Card[]>>({});
  const navigate = useNavigate();

  // 模拟数据
  const mockCards: Card[] = [
    {
      id: '1',
      Title: '创新思维',
      Quote: '创新是成功的关键',
      Detail: '创新能够帮助我们找到新的解决方案，开拓新的市场机会。',
      Creator: '张三',
      Created: new Date().toISOString(),
      gradient: 'card-gradient-1',
    },
    {
      id: '2',
      Title: '团队协作',
      Quote: '一个人可以走得很快，但一群人可以走得更远',
      Detail: '团队协作能够汇集不同的想法和技能，创造出超越个人能力的成果。',
      Creator: '李四',
      Created: new Date().toISOString(),
      gradient: 'card-gradient-2',
    },
    {
      id: '3',
      Title: '成长型思维',
      Quote: '挑战不是阻碍，而是成长的机会',
      Detail: '拥有成长型思维的人相信能力可以通过努力和学习来发展。',
      Creator: '王五',
      Created: new Date(Date.now() - 86400000).toISOString(), // 昨天
      gradient: 'card-gradient-3',
    },
    {
      id: '4',
      Title: '持续学习',
      Quote: '活到老，学到老',
      Detail: '在快速变化的世界中，持续学习是保持竞争力的关键。',
      Creator: '赵六',
      Created: new Date(Date.now() - 86400000).toISOString(), // 昨天
      gradient: 'card-gradient-4',
    },
  ];

  // 加载卡片数据
  useEffect(() => {
    const loadCards = async () => {
      try {
        setLoading(true);
        setError(null);

        // 模拟API调用延迟
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 使用模拟数据
        setCards(mockCards);

        // 过滤有效卡片
        const validCards = mockCards.filter(
          (card) => card && card.Title && card.Quote
        );

        // 按日期分组
        const grouped = groupCardsByDate(validCards);
        setGroupedCards(grouped);
      } catch (err) {
        console.error('加载卡片失败:', err);
        setError('加载失败，请稍后再试');
      } finally {
        setLoading(false);
      }
    };

    loadCards();
  }, []);

  // 按日期分组卡片
  const groupCardsByDate = (cards: Card[]): Record<string, Card[]> => {
    const grouped: Record<string, Card[]> = {};

    cards.forEach((card) => {
      const date = new Date(card.Created).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(card);
    });

    return grouped;
  };

  // 格式化日期显示
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  // 处理卡片点击
  const handleCardClick = (cardId: string) => {
    navigate(`/card-detail?id=${cardId}`);
  };

  // 提交评论
  const handleSubmitComment = async (
    cardId: string,
    name: string,
    comment: string
  ) => {
    if (!name.trim() || !comment.trim()) {
      alert('请填写姓名和评论内容');
      return;
    }

    try {
      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 显示成功消息
      alert('评论提交成功！');
    } catch (err) {
      console.error('提交评论失败:', err);
      alert('提交评论失败，请稍后再试');
    }
  };

  // 卡片组件
  const CardComponent: React.FC<{
    card: Card;
    onCardClick: (id: string) => void;
    onSubmitComment: (id: string, name: string, comment: string) => void;
  }> = ({ card, onCardClick, onSubmitComment }) => {
    const [showCommentForm, setShowCommentForm] = useState<boolean>(false);
    const [commentName, setCommentName] = useState<string>('');
    const [commentText, setCommentText] = useState<string>('');

    // 获取字体颜色
    const fontColor = getFontColorForGradient(
      card.gradient || 'card-gradient-1'
    );
    // Quote box背景色
    const quoteBoxBg = 'rgba(255, 255, 255, 0.9)';
    // 最终图片路径，使用默认图片如果没有提供
    const finalImage = card.ImagePath || '/images/mistyblue.png';

    // 格式化创建日期
    const formatCardDate = (dateString: string): string => {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    return (
      <div className="card-container" onClick={() => onCardClick(card.id)}>
        <div
          className={`card ${card.gradient || 'card-gradient-1'}`}
          style={{
            cursor: 'pointer',
            color: fontColor,
            fontFamily: card.Font || 'sans-serif',
          }}
        >
          {/* 卡片图片 */}
          {finalImage && (
            <img
              src={finalImage}
              alt={card.Title}
              className="card-image"
              loading="lazy"
            />
          )}

          {/* 卡片标题 */}
          <div className="card-header">
            <h3 className="card-title">{card.Title}</h3>
            <div className="card-date">{formatCardDate(card.Created)}</div>
          </div>

          {/* 卡片引言 */}
          <div
            className="card-quote-container"
            style={{ backgroundColor: quoteBoxBg }}
          >
            <p className="card-quote">"{card.Quote}"</p>
          </div>

          {/* 卡片详情 */}
          {card.Detail && (
            <div className="card-detail">
              <p>{card.Detail}</p>
            </div>
          )}

          {/* 卡片创作者 */}
          {card.Creator && (
            <div className="card-creator">
              <span>— {card.Creator}</span>
            </div>
          )}
        </div>
        <div
          className={`card ${card.gradient || 'card-gradient-1'}`}
          style={{
            cursor: 'pointer',
            color: fontColor,
            fontFamily: card.Font || 'sans-serif',
          }}
        >
          {/* 卡片悬停覆盖层 */}
          <div
            className="card-hover-overlay"
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setShowCommentForm(false)}
          >
            <button
              className="btn btn-warm view-details-btn"
              onClick={() => onCardClick(card.id)}
            >
              查看详情
            </button>

            {showCommentForm && (
              <div className="comment-form-container">
                <div className="comment-form-title">添加评论</div>
                <input
                  type="text"
                  className="form-input comment-input"
                  placeholder="你的名字"
                  value={commentName}
                  onChange={(e) => setCommentName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <textarea
                  className="form-input comment-textarea"
                  placeholder="写下你的想法..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  className="btn btn-warm submit-comment-btn"
                  onClick={() =>
                    onSubmitComment(card.id, commentName, commentText)
                  }
                >
                  提交评论
                </button>
              </div>
            )}

            <button
              className="btn btn-secondary add-comment-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowCommentForm(!showCommentForm);
              }}
            >
              {showCommentForm ? '取消' : '添加评论'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="cards-page bg-gradient-default">
      <div className="cards-container">
        <div id="cards-content">
          {loading ? (
            <div className="loading-placeholder">加载中...</div>
          ) : error ? (
            <div className="text-center p-lg">{error}</div>
          ) : Object.keys(groupedCards).length === 0 ? (
            <div className="text-center p-lg">暂无卡片数据</div>
          ) : (
            // 按日期排序（最新的在前）
            Object.keys(groupedCards)
              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
              .map((date) => (
                <div key={date}>
                  <h2 className="date-heading">{formatDate(date)}</h2>
                  <div className="date-cards-container">
                    {groupedCards[date].map((card) => (
                      <CardComponent
                        key={card.id}
                        card={card}
                        onCardClick={handleCardClick}
                        onSubmitComment={handleSubmitComment}
                      />
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Cards;
