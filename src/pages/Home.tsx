import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

interface CardData {
  id: string;
  title: string;
  quote: string;
  coverUrl: string;
  author: string;
  date: string;
  tags: string[];
}

const Home: React.FC = () => {
  const [cards, setCards] = useState<CardData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // 加载最新卡片数据
  const loadLatestCards = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 这里应该调用API获取卡片数据
      // 现在使用模拟数据
      const mockCards: CardData[] = [
        {
          id: '1',
          title: '生命的意义',
          quote:
            '生命的意义不在于你呼吸了多少次，而在于有多少个让你屏住呼吸的时刻。',
          coverUrl: '/public/images/MorningRunlight.png',
          author: '匿名用户',
          date: '2024-01-15',
          tags: ['人生感悟', '哲理'],
        },
        {
          id: '2',
          title: '创新思维',
          quote: '创新不是推翻一切，而是在现有基础上看到新的可能性。',
          coverUrl: '/public/images/mistyblue.png',
          author: '李小明',
          date: '2024-01-14',
          tags: ['创新', '思维'],
        },
        {
          id: '3',
          title: '坚持不懈',
          quote: '成功的秘诀在于即使看不到希望，也依然选择坚持。',
          coverUrl: '/public/images/MistyMorningOnaCountryRoad.png',
          author: '王小红',
          date: '2024-01-13',
          tags: ['坚持', '成功'],
        },
      ];

      // 模拟网络延迟
      await new Promise((resolve) => setTimeout(resolve, 500));

      setCards(mockCards);
      setIsLoading(false);
    } catch (err) {
      setError('加载卡片失败，请稍后重试');
      setIsLoading(false);
      console.error('加载卡片错误:', err);
    }
  };

  // 轮播相关函数
  const nextSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === cards.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? cards.length - 1 : prevIndex - 1
    );
  };

  // 自动播放
  const startAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
    autoPlayRef.current = setInterval(nextSlide, 5000);
  };

  const stopAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  };

  const toggleAutoPlay = () => {
    if (isPlaying) {
      stopAutoPlay();
    } else {
      startAutoPlay();
    }
    setIsPlaying(!isPlaying);
  };

  // 键盘导航处理
  const handleKeyboardNavigation = (e: KeyboardEvent) => {
    if (carouselRef.current?.contains(e.target as Node)) {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          prevSlide();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextSlide();
          break;
        case ' ':
          e.preventDefault();
          toggleAutoPlay();
          break;
      }
    }
  };

  // 触摸滑动支持
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    e.currentTarget.setAttribute(
      'data-touch-start-x',
      touch.clientX.toString()
    );
    e.currentTarget.setAttribute(
      'data-touch-start-y',
      touch.clientY.toString()
    );
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const startX = parseInt(
      e.currentTarget.getAttribute('data-touch-start-x') || '0'
    );
    const startY = parseInt(
      e.currentTarget.getAttribute('data-touch-start-y') || '0'
    );
    const touch = e.touches[0];
    const diffX = startX - touch.clientX;
    const diffY = startY - touch.clientY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
      e.currentTarget.removeAttribute('data-touch-start-x');
      e.currentTarget.removeAttribute('data-touch-start-y');
    }
  };

  // 初始化和清理
  useEffect(() => {
    loadLatestCards();

    // 键盘导航
    window.addEventListener('keydown', handleKeyboardNavigation);

    return () => {
      window.removeEventListener('keydown', handleKeyboardNavigation);
      stopAutoPlay();
    };
  }, []);

  // 自动播放
  useEffect(() => {
    if (cards.length > 1 && isPlaying) {
      startAutoPlay();
    }

    return () => {
      stopAutoPlay();
    };
  }, [cards.length, isPlaying]);

  // 渲染轮播内容
  const renderCarouselContent = () => {
    if (isLoading) {
      return (
        <div className="loading">
          <p>加载中...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="loading">
          <p>{error}</p>
          <button className="cta-btn primary" onClick={loadLatestCards}>
            重新加载
          </button>
        </div>
      );
    }

    if (cards.length === 0) {
      return (
        <div className="loading">
          <p>暂无最新卡片内容</p>
          <Link to="/cards" className="cta-btn primary">
            查看所有卡片
          </Link>
        </div>
      );
    }

    return (
      <div
        className="carousel-track"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {cards.map((card) => (
          <div key={card.id} className="carousel-card">
            <div className="card-preview">
              <div
                className="cover"
                style={{ backgroundImage: `url(${card.coverUrl})` }}
              >
                <div className="cover-overlay">
                  <div className="cover-content">
                    <h3 className="cover-title">{card.title}</h3>
                    <p className="cover-quote">{card.quote}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-content">
              <div className="card-meta">
                <span>作者: {card.author}</span>
                <span>·</span>
                <span>{card.date}</span>
              </div>
              <h2 className="card-title">{card.title}</h2>
              <blockquote className="card-quote">{card.quote}</blockquote>
              <div className="card-detail">
                <div className="card-tags">
                  {card.tags.map((tag, index) => (
                    <span key={index} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <Link to={`/card-detail/${card.id}`} className="view-all-btn">
                  查看详情
                  <span className="arrow">→</span>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="home-page">
      {/* 轮播部分 */}
      <section className="carousel-section" ref={carouselRef}>
        <h1 className="section-title">最新启发卡片</h1>
        <div className="carousel-container">
          <div
            className="carousel-wrapper"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onMouseEnter={() => stopAutoPlay()}
            onMouseLeave={() => isPlaying && startAutoPlay()}
          >
            <div id="carousel-content">{renderCarouselContent()}</div>
          </div>

          {/* 轮播控制按钮 */}
          {cards.length > 1 && (
            <>
              <button
                className="carousel-control prev"
                onClick={prevSlide}
                aria-label="上一张"
              >
                ←
              </button>
              <button
                className="carousel-control next"
                onClick={nextSlide}
                aria-label="下一张"
              >
                →
              </button>
              <button
                id="play-btn"
                className="carousel-control play"
                onClick={toggleAutoPlay}
                aria-label={isPlaying ? '暂停自动播放' : '开始自动播放'}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>

              {/* 指示器 */}
              <div className="carousel-indicators">
                {cards.map((_, index) => (
                  <button
                    key={index}
                    className={`indicator ${
                      index === currentIndex ? 'active' : ''
                    }`}
                    onClick={() => setCurrentIndex(index)}
                    aria-label={`转到幻灯片 ${index + 1}`}
                  ></button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 查看全部按钮 */}
        <div className="view-all-container">
          <Link to="/cards" className="view-all-btn">
            查看所有卡片
            <span className="arrow">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
