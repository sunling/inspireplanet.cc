import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { api } from '@/netlify/configs';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Avatar,
  CircularProgress,
  useTheme,
  FormControl,
  FormHelperText,
  Card as MuiCard,
  CardContent,
  CardActions,
  InputAdornment,
  Snackbar,
  Alert,
} from '@mui/material';
import { useResponsive } from '@/hooks/useResponsive';

import { gradientOptions, getFontColorForGradient } from '@/constants/gradient';
import { CardItem, SearchImageResult } from '@/netlify/types';
import { CarouselItem } from '@/components/Carousel';
import Carousel from '@/components/Carousel';
import styles from './index.module.css';
import useSnackbar from '@/hooks/useSnackbar';

const CreateCard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const { showSnackbar, SnackbarComponent } = useSnackbar();
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 卡片数据状态
  const [cardData, setCardData] = useState<CardItem>({
    id: '',
    created: '',
    title: '',
    quote: '',
    detail: '',
    creator: '',
    font: 'Noto Sans SC',
    gradientClass: 'card-gradient-1',
  });

  // 轮播卡片状态
  const [carouselCards, setCarouselCards] = useState<CarouselItem[]>([]);

  // 图片相关状态
  const [customImage, setCustomImage] = useState<string>('');
  const [selectedSearchImage, setSelectedSearchImage] = useState<string>('');
  const [searchImages, setSearchImages] = useState<SearchImageResult[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchError, setSearchError] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [fileStatus, setFileStatus] = useState<string>('');

  // 功能状态
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);

  // 初始化用户信息和随机渐变
  useEffect(() => {
    initUserInfo();
    initRandomGradient();
    loadLatestCardsCarousel();
  }, []);

  // 初始化用户信息
  const initUserInfo = () => {
    try {
      const userInfoStr = localStorage.getItem('userInfo');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        if (userInfo.name) {
          setCardData((prev) => ({ ...prev, creator: userInfo.name }));
        }
      }
    } catch (error) {
      console.error('解析用户信息失败:', error);
    }
  };

  // 初始化随机渐变
  const initRandomGradient = () => {
    const randomIndex = Math.floor(Math.random() * gradientOptions.length);
    const randomGradient = gradientOptions[randomIndex];
    setCardData((prev) => ({ ...prev, gradientClass: randomGradient.class }));
  };

  // 处理输入变化
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { id, value } = e.target;
    setCardData((prev) => ({ ...prev, [id]: value }));
  };

  // 处理渐变选择
  const handleGradientSelect = (gradientClass: string) => {
    setCardData((prev) => ({ ...prev, gradientClass }));
  };

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      showSnackbar('请上传有效的图片文件', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCustomImage(result);
      setSelectedSearchImage('');
      setFileStatus(`已上传: ${file.name}`);
    };
    reader.onerror = () => {
      showSnackbar('图片读取失败', 'error');
      setFileStatus('上传失败');
    };
    reader.readAsDataURL(file);

    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 处理搜索图片
  const searchImagesFromDetail = async () => {
    if (!cardData?.detail) {
      showSnackbar('请先填写你的启发内容', 'info');
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setShowSearchResults(false);

    try {
      // 构建搜索查询
      const query = (cardData?.detail || '').substring(0, 50); // 使用前50个字符作为搜索词
      setSearchQuery(query);

      // 这里应该调用搜索图片的API
      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 模拟搜索结果
      const mockResults: SearchImageResult[] = [
        {
          url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd',
          thumb:
            'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&q=80&w=200',
          title: '自然风景',
          description: '美丽的自然风光',
        },
        {
          url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
          thumb:
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=200',
          title: '山川河流',
          description: '壮观的山川河流景色',
        },
        {
          url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b',
          thumb:
            'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&q=80&w=200',
          title: '日出日落',
          description: '美丽的日出日落景象',
        },
      ];

      setSearchImages(mockResults);
      setShowSearchResults(true);
    } catch (error) {
      console.error('搜索图片失败:', error);
      setSearchError('搜索图片失败，请稍后重试');
    } finally {
      setIsSearching(false);
    }
  };

  // 选择搜索到的图片
  const handleSelectSearchImage = (image: SearchImageResult) => {
    setSelectedSearchImage(image.url);
    setCustomImage('');
    setShowSearchResults(false);
  };

  // 下载卡片图片
  const downloadCardImage = async () => {
    if (!previewRef.current) return;

    setIsDownloading(true);
    try {
      // 动态导入html2canvas
      const { default: html2canvas } = await import('html2canvas');

      // 找到预览中的卡片元素
      const cardElement = previewRef.current.querySelector('.card');
      if (!cardElement) {
        throw new Error('未找到卡片元素');
      }

      // 配置html2canvas选项
      const canvas = await html2canvas(cardElement as any, {
        scale: 2, // 提高清晰度
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      // 创建下载链接
      const link = document.createElement('a');
      const fileName = `inspire-card-${cardData.title.replace(
        /[^a-zA-Z0-9\u4e00-\u9fa5]/g,
        '-'
      )}.png`;
      link.download = fileName;
      link.href = canvas.toDataURL('image/png');

      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSnackbar('卡片下载成功', 'success');
    } catch (error) {
      console.error('下载卡片失败:', error);
      showSnackbar('下载卡片失败，请稍后重试', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  // 提交卡片
  const submitCard = async () => {
    // 验证必填字段
    if (!cardData.title.trim()) {
      showSnackbar('请输入标题', 'warning');
      return;
    }
    if (!cardData.quote.trim()) {
      showSnackbar('请输入触动你的观点', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const cardToSubmit = {
        ...cardData,
        created: new Date().toISOString(),
        upload: customImage,
        imagePath: selectedSearchImage,
      };

      // 调用API提交卡片
      const response = await api.cards.create(cardToSubmit);

      if (response.success) {
        showSnackbar('卡片提交成功！', 'success');
        // 重置表单
        resetForm();
        // 重新加载轮播卡片
        loadLatestCardsCarousel();
      } else {
        throw new Error(response.error || '提交失败');
      }
    } catch (error) {
      console.error('提交卡片失败:', error);
      showSnackbar('提交失败，请稍后重试', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 重置表单
  const resetForm = () => {
    setCardData((prev) => ({
      ...prev,
      title: '',
      quote: '',
      detail: '',
    }));
    setCustomImage('');
    setSelectedSearchImage('');
    setFileStatus('');
  };

  // 加载最新卡片轮播
  const loadLatestCardsCarousel = async () => {
    try {
      const response = await api.cards.getAll();
      console.log('api.cards.getAll()', response);

      if (!response.success) {
        throw new Error(response.error || '获取卡片失败');
        return;
      }

      setCarouselCards(
        (response.data || []).map((card: any) => ({
          id: card.id,
          title: card.title,
          quote: card.quote,
          imagePath: card.imagePath,
          creator: card.creator,
          font: card.font,
          gradientClass: card.gradientClass,
          episode: '',
          name: card.creator || '匿名',
          detail: card.detail || '',
          created: card.created,
        }))
      );
    } catch (error) {
      console.error('加载最新卡片失败:', error);
      // 使用备用数据
      const fallbackCards: CarouselItem[] = [
        {
          id: '1',
          title: '生命的意义',
          quote:
            '生命的意义不在于你呼吸了多少次，而在于有多少个让你屏住呼吸的时刻。',
          episode: '',
          name: '张三',
          detail: '',
          created: new Date().toISOString(),
        },
      ];
      setCarouselCards(fallbackCards);
    }
  };

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
            创造你的启发时刻卡片
          </Typography>
        </Box>

        <Box className={styles.mainContent}>
          <Grid container spacing={4} sx={{ width: '100%' }}>
            <Grid sx={{ xs: 12, md: 6 }}>
              <Paper
                elevation={3}
                sx={{ p: 4, borderRadius: 2, bgcolor: 'white' }}
              >
                {/* 第一行：标题 */}
                <Box className={styles.formRow} sx={{ gap: 2, mb: 3 }}>
                  <FormControl fullWidth sx={{ flex: '0 0 120px' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      创作者
                    </Typography>
                    <TextField
                      id="creator"
                      placeholder="匿名"
                      value={cardData.creator}
                      onChange={handleInputChange}
                      variant="outlined"
                      fullWidth
                      size="small"
                    />
                  </FormControl>
                  <FormControl fullWidth>
                    <Typography variant="subtitle2" gutterBottom>
                      标题
                    </Typography>
                    <TextField
                      id="title"
                      placeholder="这一刻，我想说..."
                      value={cardData.title}
                      onChange={handleInputChange}
                      variant="outlined"
                      fullWidth
                      size="small"
                    />
                  </FormControl>
                </Box>

                {/* 第二行：触动你的观点 */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    触动你的观点
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', ml: 1 }}
                    >
                      按回车↩︎换行
                    </Typography>
                  </Typography>
                  <TextField
                    id="quote"
                    placeholder="写下让你触动的一句话、一段对话、或一个片段..."
                    value={cardData.quote}
                    onChange={handleInputChange}
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={3}
                  />
                </FormControl>

                {/* 第三行：你的启发 */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    你的启发
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', ml: 1 }}
                    >
                      支持 Markdown 语法，按回车↩︎换行
                    </Typography>
                  </Typography>
                  <TextField
                    id="detail"
                    placeholder="写下你的启发和行动吧..."
                    value={cardData.detail}
                    onChange={handleInputChange}
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={5}
                  />
                </FormControl>

                {/* 第四行：选择背景 */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    选择背景
                  </Typography>
                  <Box className={styles.gradientSelector} sx={{ gap: 1 }}>
                    {gradientOptions.map((option) => (
                      <div
                        key={option.class}
                        className={`${styles.gradientOption} ${
                          cardData.gradientClass === option.class
                            ? styles.selected
                            : ''
                        }`}
                        style={{
                          background: option.gradient,
                        }}
                        title={option.title}
                        onClick={() => handleGradientSelect(option.class)}
                      />
                    ))}
                  </Box>
                </FormControl>

                {/* 图片上传 */}
                <FormControl fullWidth sx={{ mb: 4 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    添加背景图片
                  </Typography>
                  <Box
                    sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outlined"
                      className={styles.secondaryButton}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      📷 选择本地图片
                    </Button>
                    <Button
                      variant="outlined"
                      className={styles.uploadButton}
                      onClick={searchImagesFromDetail}
                      disabled={isSearching}
                    >
                      {isSearching ? (
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                      ) : null}
                      搜索图片
                    </Button>
                  </Box>
                  {fileStatus && (
                    <Typography variant="caption" color="text.secondary">
                      {fileStatus}
                    </Typography>
                  )}
                </FormControl>

                {/* 搜索结果展示 */}
                {showSearchResults && searchImages.length > 0 && (
                  <Box
                    sx={{
                      mb: 4,
                      p: 2,
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                    }}
                    className={styles.searchResults}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      搜索结果: {searchQuery}
                    </Typography>
                    <Box className={styles.imageGrid}>
                      {searchImages.map((image, index) => (
                        <Box
                          key={index}
                          className={`${styles.imageItem} ${
                            selectedSearchImage === image.url
                              ? styles.selected
                              : ''
                          }`}
                          onClick={() => handleSelectSearchImage(image)}
                        >
                          <img
                            src={image.thumb}
                            alt={image.title}
                            style={{
                              width: '100%',
                              height: 'auto',
                              display: 'block',
                            }}
                          />
                          <Box className={styles.imageOverlay}>
                            <Typography variant="caption">
                              {image.description}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {searchError && (
                  <Typography variant="body2" color="error" sx={{ mb: 3 }}>
                    {searchError}
                  </Typography>
                )}

                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    justifyContent: 'center',
                    mt: 3,
                  }}
                >
                  <Button
                    className={styles.primaryButton}
                    onClick={submitCard}
                    disabled={isSubmitting}
                    sx={{ px: 4 }}
                  >
                    {isSubmitting ? (
                      <CircularProgress
                        size={20}
                        color="inherit"
                        sx={{ mr: 1 }}
                      />
                    ) : null}
                    提交到展示区
                  </Button>
                  <Button
                    className={styles.secondaryButton}
                    onClick={downloadCardImage}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                    ) : null}
                    下载卡片
                  </Button>
                </Box>
              </Paper>
            </Grid>

            <Grid sx={{ xs: 12, md: 6 }}>
              <Box id="preview" ref={previewRef} className={styles.cardPreview}>
                {/* 卡片预览 */}
                <MuiCard
                  className={`card ${
                    styles[cardData.gradientClass.replace('card-', '')] || ''
                  }`}
                  sx={{
                    width: '100%',
                    maxWidth: '400px',
                    minHeight: '500px',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: cardData.font,
                    background:
                      gradientOptions.find(
                        (g) => g.class === cardData.gradientClass
                      )?.gradient || '#f5f5f5',
                  }}
                >
                  <CardContent
                    sx={{
                      flexGrow: 1,
                      color: getFontColorForGradient(cardData.gradientClass),
                    }}
                  >
                    <Typography
                      variant="h5"
                      component="h2"
                      gutterBottom
                      sx={{ fontWeight: 'bold' }}
                    >
                      {cardData.title || '这一刻，我想说...'}
                    </Typography>
                    <Box
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        p: 2,
                        borderRadius: 1,
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          color: getFontColorForGradient(
                            cardData.gradientClass
                          ),
                        }}
                      >
                        {cardData.quote || '请写下触动到你的观点或者你的启发'}
                      </Typography>
                    </Box>
                    {(customImage || selectedSearchImage) && (
                      <Box sx={{ mb: 2 }}>
                        <img
                          src={customImage || selectedSearchImage}
                          alt="预览图片"
                          style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '4px',
                          }}
                        />
                      </Box>
                    )}
                    {cardData.detail && (
                      <Box
                        sx={{
                          color: getFontColorForGradient(
                            cardData.gradientClass
                          ),
                          '& *': {
                            color: 'inherit !important',
                          },
                        }}
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(
                            marked.parse(cardData.detail)
                          ),
                        }}
                      />
                    )}
                  </CardContent>
                  <CardActions
                    sx={{
                      justifyContent: 'center',
                      color: getFontColorForGradient(cardData.gradientClass),
                    }}
                  >
                    <Typography variant="body2">
                      ——作者：{cardData.creator || '匿名'}
                    </Typography>
                  </CardActions>
                </MuiCard>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* 最新提交的卡片部分 */}
        {carouselCards.length > 0 && (
          <Box className={styles.latestCardsSection}>
            <Typography variant="h5" component="h2" gutterBottom align="center">
              展示区
            </Typography>
            <Box className={styles.carouselContainer}>
              <Carousel
                items={carouselCards}
                height="400px"
                autoPlay={true}
                showIndicators={true}
                showPlayButton={true}
              />
            </Box>
            <Box className={styles.viewAllButtonContainer}>
              <a
                href="/cards"
                className={styles.viewAllButton}
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/cards');
                }}
              >
                浏览更多灵感
              </a>
            </Box>
          </Box>
        )}
      </Container>
      <SnackbarComponent />
    </Box>
  );
};

export default CreateCard;
