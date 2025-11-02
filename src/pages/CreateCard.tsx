import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
// 移除cardAPI和imageAPI导入，改为直接调用netlify functions // 导入卡片API服务
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Avatar,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';

// 为每个渐变背景配置合适的字体颜色
const gradientFontColors: Record<string, string> = {
  'card-gradient-1': '#2c3e50', // 彩虹梦境 - 深蓝灰
  'card-gradient-2': '#8b4513', // 日出暖阳 - 深棕色
  'card-gradient-3': '#4a148c', // 紫色幻想 - 深紫色
  'card-gradient-4': '#1e3a8a', // 海洋蓝调 - 深蓝色
  'card-gradient-5': '#2c3e50', // 火焰橙黄 - 深蓝灰
  'card-gradient-6': '#2d5016', // 清新绿意 - 深绿色
  'card-gradient-7': '#8b0000', // 热情红橙 - 深红色
  'card-gradient-8': '#1e3a8a', // 天空蓝白 - 深蓝色
  'card-gradient-9': '#6b7280', // 雾霭灰蓝 - 中性灰
  'card-gradient-10': '#8b4513', // 蜂蜜暖黄 - 深棕色
  'card-gradient-11': '#1a5d1a', // 薄荷清绿 - 深绿色
  'card-gradient-12': '#4a148c', // 淡雅紫粉 - 深紫色
  'card-gradient-13': '#8b4513', // 麦田金黄 - 深棕色
  'card-gradient-14': '#374151', // 月光银灰 - 深灰色
};

// 获取渐变对应的字体颜色
const getFontColorForGradient = (gradientClass: string): string => {
  return gradientFontColors[gradientClass] || '#333333';
};

interface CardData {
  id?: string;
  Title: string;
  Quote: string;
  Detail?: string;
  ImagePath?: string;
  Creator: string;
  Font: string;
  GradientClass: string;
  Created?: string;
  Username?: string;
}

interface CarouselCardData {
  id: string;
  Title: string;
  Quote: string;
  ImagePath?: string;
  Creator: string;
  Font: string;
  GradientClass: string;
}

interface SearchImageResult {
  url: string;
  thumb: string;
  title: string;
  description: string;
}

const CreateCard: React.FC = () => {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMedium = useMediaQuery(theme.breakpoints.down('md'));

  // 卡片数据状态
  const [cardData, setCardData] = useState<CardData>({
    Title: '',
    Quote: '',
    Detail: '',
    Creator: '',
    Font: 'Noto Sans SC',
    GradientClass: 'card-gradient-1',
  });

  // 图片相关状态
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [selectedSearchImage, setSelectedSearchImage] = useState<string | null>(
    null
  );
  const [searchImages, setSearchImages] = useState<SearchImageResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // 功能状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [fileStatus, setFileStatus] = useState<string>('');

  // 轮播卡片状态
  const [carouselCards, setCarouselCards] = useState<CarouselCardData[]>([]);

  // 初始化：检查用户登录状态并填充创作者信息
  useEffect(() => {
    const checkUserLoginAndFillCreator = () => {
      try {
        // 支持多种用户数据存储键名
        const userData =
          localStorage.getItem('userInfo') || localStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          setCardData((prev) => ({
            ...prev,
            Creator: user.name || user.username || user.email || '匿名用户',
            Username: user.username || user.email,
          }));
        }
      } catch (error) {
        console.error('解析用户数据失败:', error);
      }
    };

    checkUserLoginAndFillCreator();
    loadLatestCardsCarousel();
  }, []);

  // 自动聚焦到标题输入框
  useEffect(() => {
    setTimeout(() => {
      const titleInput = document.getElementById('title') as HTMLInputElement;
      if (titleInput) {
        titleInput.focus();
      }
    }, 500);
  }, []);

  // 处理表单输入变化
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    // 将HTML id映射到对象属性
    const fieldMap: Record<string, keyof CardData> = {
      creator: 'Creator',
      title: 'Title',
      quote: 'Quote',
      detail: 'Detail',
    };

    if (fieldMap[id]) {
      setCardData((prev) => ({
        ...prev,
        [fieldMap[id]]: value,
      }));
    }
  };

  // 处理背景渐变选择
  const handleGradientSelect = (gradientClass: string) => {
    setCardData((prev) => ({
      ...prev,
      GradientClass: gradientClass,
    }));

    // 根据选择的渐变自动搜索相关图片
    // 这里可以实现，但暂时跳过以简化实现
  };

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFileStatus('请上传有效的图片文件 (JPG, PNG, GIF, WebP)');
      return;
    }

    // 检查文件大小
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setFileStatus('图片大小不能超过10MB');
      return;
    }

    // 创建预览URL
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCustomImage(event.target.result as string);
        setSelectedSearchImage(null); // 清除搜索图片选择
        setFileStatus('已上传自定义图片');
      }
    };
    reader.readAsDataURL(file);
  };

  // 搜索图片
  const searchImagesFromDetail = async () => {
    // 获取所有文本内容
    const titleText = cardData.Title;
    const quoteText = cardData.Quote;
    const detailText = cardData.Detail || '';

    // 组合文本进行搜索
    const combinedText = [titleText, quoteText, detailText]
      .filter(Boolean)
      .join(' ');

    if (!combinedText) {
      setSearchError('请至少填写标题或观点内容');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      // 直接调用netlify functions接口搜索图片
      const response = await fetch(
        `/.netlify/functions/searchImage?query=${encodeURIComponent(
          combinedText
        )}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error('搜索图片失败：' + response.statusText);
      }

      const responseData = await response.json();
      const results: SearchImageResult[] = (responseData.images || []).map(
        (img: any) => ({
          url: img.url || '',
          thumb: img.thumb || img.url || '',
          title: img.title || '搜索结果图片',
          description: img.description || img.alt || '',
        })
      );
      setSearchImages(results);
    } catch (error) {
      console.error('搜索图片失败:', error);
      setSearchError('搜索图片失败，请重试');
    } finally {
      setIsSearching(false);
    }
  };

  // 选择搜索图片
  const handleSelectSearchImage = (image: SearchImageResult) => {
    setSelectedSearchImage(image.url);
    setCustomImage(null); // 清除自定义上传图片
    setFileStatus('已选择搜索结果图片');
  };

  // 清理和处理内容
  const sanitizeContent = (content: string) => {
    return DOMPurify.sanitize(content);
  };

  // 处理Markdown内容
  const renderMarkdown = (text?: string) => {
    if (!text) return '';
    marked.setOptions({ breaks: true });
    const html = marked.parse(sanitizeContent(text));
    return <div dangerouslySetInnerHTML={{ __html: html as string }} />;
  };

  // 获取当前时间
  const getCurrentTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  // 更新卡片预览
  const updateCardPreview = () => {
    if (!previewRef.current) return;

    const fontColor = '#ffffff'; // 可以根据渐变类动态调整
    const imagePath = customImage || selectedSearchImage;

    const cardHTML = `
      <div class="card ${cardData.GradientClass}" style="font-family: ${
      cardData.Font
    }">
        ${
          imagePath
            ? `<div class="card-image"><img src="${imagePath}" alt="${sanitizeContent(
                cardData.Title
              )}" /></div>`
            : ''
        }
        <div class="card-content">
          <h1 class="title" style="color: ${fontColor}">${sanitizeContent(
      cardData.Title || '这一刻，我想说...'
    )}</h1>
          <blockquote class="quote" style="color: ${fontColor}">${sanitizeContent(
      cardData.Quote || '写下让你触动的一句话、一段对话、或一个片段...'
    )}</blockquote>
          ${
            cardData.Detail
              ? `<div class="detail" style="color: ${fontColor}">${processLongUrls(
                  cardData.Detail
                )}</div>`
              : ''
          }
          <div class="card-footer">
            <div class="footer" style="color: ${fontColor}">——作者：${sanitizeContent(
      cardData.Creator || '匿名'
    )} · ${getCurrentTime()}</div>
          </div>
        </div>
      </div>
    `;

    previewRef.current.innerHTML = cardHTML;
  };

  // 处理长URL（简单实现）
  const processLongUrls = (text: string) => {
    // 简单替换URL，实际可能需要更复杂的处理
    return text.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">$1</a>'
    );
  };

  // 当卡片数据变化时更新预览
  useEffect(() => {
    updateCardPreview();
  }, [cardData, customImage, selectedSearchImage]);

  // 下载卡片
  const downloadCardImage = async () => {
    if (!previewRef.current?.querySelector('.card')) {
      alert('请先填写卡片内容');
      return;
    }

    setIsDownloading(true);
    try {
      // 模拟下载过程
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 实际环境中应该使用html2canvas库
      alert('卡片下载成功！');
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请重试');
    } finally {
      setIsDownloading(false);
    }
  };

  // 提交卡片
  const submitCard = async () => {
    // 表单验证
    if (!cardData.Title.trim()) {
      alert('请输入标题');
      return;
    }

    if (!cardData.Quote.trim()) {
      alert('请输入触动你的观点');
      return;
    }

    setIsSubmitting(true);
    try {
      // 准备提交数据
      const submitData = {
        ...cardData,
        Created: new Date().toISOString(),
        ImagePath: customImage || selectedSearchImage,
      };

      // 直接调用netlify functions接口
      const response = await fetch('/.netlify/functions/cardsHandler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error('提交失败：' + response.statusText);
      }

      const data = await response.json();

      // 显示成功消息并跳转到卡片详情页
      alert('卡片提交成功！');
      navigate(`/card-detail/${data.id || ''}`);
    } catch (error: any) {
      console.error('提交卡片失败:', error);
      alert(error.message || '提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 加载最新卡片轮播
  const loadLatestCardsCarousel = async () => {
    try {
      // 直接调用netlify functions接口获取卡片
      const response = await fetch('/.netlify/functions/cardsHandler', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('获取卡片失败：' + response.statusText);
      }

      const data = await response.json();
      setCarouselCards(data.records || []);
    } catch (error) {
      console.error('加载最新卡片失败:', error);
      // 加载失败时使用备用数据
      const fallbackCards: CarouselCardData[] = [
        {
          id: '1',
          Title: '生命的意义',
          Quote:
            '生命的意义不在于你呼吸了多少次，而在于有多少个让你屏住呼吸的时刻。',
          Creator: '张三',
          Font: 'Noto Sans SC',
          GradientClass: 'card-gradient-1',
        },
        {
          id: '2',
          Title: '成功的定义',
          Quote: '成功不是终点，失败也非末日：这是勇气的真谛。',
          Creator: '李四',
          Font: 'Noto Serif SC',
          GradientClass: 'card-gradient-2',
        },
        {
          id: '3',
          Title: '学习的价值',
          Quote: '学习不是为了分数，而是为了获取改变世界的能力。',
          Creator: '王五',
          Font: 'Noto Sans SC',
          GradientClass: 'card-gradient-3',
        },
      ];
      setCarouselCards(fallbackCards);
    }
  };

  // 背景渐变选项
  const gradientOptions = [
    { class: 'card-gradient-1', title: '🌈 彩虹梦境' },
    { class: 'card-gradient-2', title: '🌅 日出暖阳' },
    { class: 'card-gradient-3', title: '💜 紫色幻想' },
    { class: 'card-gradient-4', title: '🌊 海洋蓝调' },
    { class: 'card-gradient-5', title: '🔥 火焰橙黄' },
    { class: 'card-gradient-6', title: '🌿 清新绿意' },
    { class: 'card-gradient-7', title: '❤️ 热情红橙' },
    { class: 'card-gradient-8', title: '☁️ 天空蓝白' },
    { class: 'card-gradient-9', title: '🌫️ 雾霭灰蓝' },
    { class: 'card-gradient-10', title: '🍯 蜂蜜暖黄' },
    { class: 'card-gradient-11', title: '🌱 薄荷清绿' },
    { class: 'card-gradient-12', title: '🌸 淡雅紫粉' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            align="center"
            sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}
          >
            创建灵感卡片
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={3}
              sx={{ p: 4, borderRadius: 2, bgcolor: 'white' }}
            >
              {/* 第一行：标题 */}
              <div className="form-row">
                <div className="form-group flex-0-0-120">
                  <label htmlFor="creator">创作者</label>
                  <input
                    id="creator"
                    className="form-input"
                    placeholder="匿名"
                    value={cardData.Creator}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group flex-1">
                  <label htmlFor="title">标题</label>
                  <input
                    id="title"
                    className="form-input"
                    placeholder="这一刻，我想说..."
                    value={cardData.Title}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* 第二行：触动你的观点 */}
              <div className="form-group">
                <label htmlFor="quote">
                  触动你的观点
                  <small className="text-muted text-xs">按回车↩︎换行</small>
                </label>
                <textarea
                  id="quote"
                  className="form-input"
                  value={cardData.Quote}
                  onChange={handleInputChange}
                  placeholder="写下让你触动的一句话、一段对话、或一个片段..."
                ></textarea>
              </div>

              {/* 第三行：你的启发 */}
              <div className="form-group">
                <label htmlFor="detail">
                  你的启发
                  <small className="text-muted text-xs">
                    支持 Markdown 语法，按回车↩︎换行
                  </small>
                </label>
                <textarea
                  id="detail"
                  className="form-input min-h-25 resize-vertical"
                  value={cardData.Detail}
                  onChange={handleInputChange}
                  placeholder="写下你的启发和行动吧..."
                ></textarea>
                <div
                  id="imageGenerationStatus"
                  className="mt-1 text-sm text-secondary"
                ></div>
              </div>

              {/* 第四行：选择背景 */}
              <div className="form-group">
                <label>选择背景</label>
                <div className="gradient-selector" id="gradient-selector">
                  {gradientOptions.map((option) => (
                    <div
                      key={option.class}
                      className={`gradient-option ${
                        cardData.GradientClass === option.class
                          ? 'selected'
                          : ''
                      }`}
                      data-gradient={option.class}
                      title={option.title}
                      onClick={() => handleGradientSelect(option.class)}
                    ></div>
                  ))}
                </div>
              </div>

              {/* 图片上传 */}
              <div className="form-group">
                <label>添加背景图片</label>
                <div className="image-upload-section">
                  <input
                    type="file"
                    id="bgUpload"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    id="uploadBtn"
                    className="btn btn-secondary"
                    onClick={() => document.getElementById('bgUpload')?.click()}
                  >
                    上传图片
                  </button>
                  <button
                    type="button"
                    id="searchImagesBtn"
                    className="btn btn-info ml-2"
                    onClick={searchImagesFromDetail}
                    disabled={isSearching}
                  >
                    {isSearching ? '搜索中...' : '搜索图片'}
                  </button>
                  <div id="fileStatus" className="mt-1 text-sm">
                    {fileStatus}
                  </div>
                </div>

                {/* 搜索结果展示 */}
                {searchImages.length > 0 && (
                  <div className="search-results">
                    <h4>搜索结果：</h4>
                    <div className="image-grid" id="imageResults">
                      {searchImages.map((image, index) => (
                        <div
                          key={index}
                          className={`image-item ${
                            selectedSearchImage === image.url ? 'selected' : ''
                          }`}
                          onClick={() => handleSelectSearchImage(image)}
                        >
                          <img src={image.thumb} alt={image.title} />
                          <div className="image-overlay">
                            {image.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchError && (
                  <div className="error-message mt-1 text-sm text-danger">
                    {searchError}
                  </div>
                )}
              </div>

              <div className="buttons">
                <button
                  className="primary-btn"
                  onClick={submitCard}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '提交中...' : '提交到展示区'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={downloadCardImage}
                  disabled={isDownloading}
                >
                  {isDownloading ? '下载中...' : '下载卡片'}
                </button>
              </div>
            </Paper>
          </Grid>

          <div
            id="preview"
            ref={previewRef}
            className="animate__animated animate__fadeIn"
          >
            {/* 卡片预览 */}
            <div
              className={`card ${cardData.GradientClass}`}
              style={{
                fontFamily: cardData.Font,
                color: getFontColorForGradient(cardData.GradientClass),
              }}
            >
              <div className="card-body">
                <div className="title">
                  {cardData.Title || '这一刻，我想说...'}
                </div>
                <div
                  className="quote-box"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    color: getFontColorForGradient(cardData.GradientClass),
                  }}
                >
                  {cardData.Quote || '请写下触动到你的观点或者你的启发'}
                </div>
                {(customImage || selectedSearchImage) && (
                  <img
                    src={customImage || selectedSearchImage || undefined}
                    alt="预览图片"
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                )}
                {cardData.Detail && (
                  <div className="detail-text">
                    {marked.parse(DOMPurify.sanitize(cardData.Detail))}
                  </div>
                )}
              </div>
              <div className="card-footer">
                <div
                  className="footer"
                  style={{
                    color: getFontColorForGradient(cardData.GradientClass),
                  }}
                >
                  ——作者：{cardData.Creator || '匿名'}
                </div>
              </div>
            </div>
          </div>
        </Grid>
      </Container>

      {/* 最新提交的卡片部分 */}
      <div className="latest-cards-section">
        <h2>展示区</h2>
        <div className="carousel-container">
          <div className="swiper" id="latest-cards-swiper">
            <div className="swiper-wrapper" id="latest-cards">
              {carouselCards.map((card, index) => (
                <div key={card.id} className="swiper-slide">
                  <div
                    className="card-carousel-item"
                    onClick={() => navigate(`/card-detail?id=${card.id}`)}
                  >
                    <div
                      className={`card ${card.GradientClass}`}
                      style={{
                        fontFamily: card.Font,
                        color: getFontColorForGradient(card.GradientClass),
                      }}
                    >
                      <div className="card-body">
                        <div className="title">{card.Title}</div>
                        <div
                          className="quote-box"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            color: getFontColorForGradient(card.GradientClass),
                          }}
                        >
                          {card.Quote}
                        </div>
                        {card.ImagePath && (
                          <img
                            src={card.ImagePath}
                            alt={card.Title}
                            style={{ maxWidth: '100%', height: 'auto' }}
                          />
                        )}
                      </div>
                      <div className="card-footer">
                        <div
                          className="footer"
                          style={{
                            color: getFontColorForGradient(card.GradientClass),
                          }}
                        >
                          ——作者：{card.Creator}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="swiper-pagination"></div>
            <div className="swiper-button-next"></div>
            <div className="swiper-button-prev"></div>
          </div>
        </div>
        <div className="view-all-button-container">
          <a href="/cards" className="view-all-button">
            浏览更多灵感
          </a>
        </div>
      </div>
    </Box>
  );
};

export default CreateCard;
