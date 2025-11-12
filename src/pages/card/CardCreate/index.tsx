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
  Grid,
  CircularProgress,
  useTheme,
  FormControl,
  Card as MuiCard,
  CardContent,
  CardActions,
} from '@mui/material';

import { gradientOptions, getFontColorForGradient } from '@/constants/gradient';
import { CardItem, SearchImageItem, SearchImageResult } from '@/netlify/types';
import InspireCard from '@/components/InspireCard';
import styles from './index.module.css';
import useSnackbar from '@/hooks/useSnackbar';

const CreateCard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
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
  const [carouselCards, setCarouselCards] = useState<CardItem[]>([]);

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
      showSnackbar.error('请上传有效的图片文件');
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
      showSnackbar.error('图片读取失败');
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
    // 获取所有相关字段的内容
    const titleText = cardData?.title || '';
    const quoteText = cardData?.quote || '';
    const detailText = cardData?.detail || '';

    // 检查至少有一个字段有内容
    if (!titleText && !quoteText && !detailText) {
      showSnackbar.info('请先输入标题、引用或启发内容');
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setShowSearchResults(false);

    try {
      // 组合所有字段的内容进行搜索
      const combinedText = [titleText, quoteText, detailText]
        .filter((text) => text.trim())
        .join(' ');

      // 限制搜索查询长度
      const query = combinedText.substring(0, 200); // 增加搜索词长度限制
      setSearchQuery(query);

      // 调用真实的图片搜索API
      const response = await api.images.search(query);
      console.log('搜索图片响应:', response);
      if (!response.success) {
        showSnackbar.error(response.error || '搜索图片失败');
      }

      if (response.data?.images?.length) {
        // 格式化搜索结果为SearchImageResult类型
        const formattedResults: SearchImageResult[] = response.data.images.map(
          (item: SearchImageItem) => ({
            url: item.url || '',
            thumb: item.thumb || item.url || '',
            title: item.title || '图片',
            description: item.description || '相关图片',
          })
        );

        setSearchImages(formattedResults);
        setShowSearchResults(true);
      } else {
        showSnackbar.error(response.error || '搜索图片失败');
      }
    } catch (error) {
      console.error('搜索图片失败:', error);
      setSearchError('搜索图片失败，请稍后重试');
      showSnackbar.error('搜索图片失败，请稍后重试');
    } finally {
      setIsSearching(false);
    }
  };

  // 选择搜索到的图片
  const handleSelectSearchImage = (image: SearchImageResult) => {
    setSelectedSearchImage(image.url);
    setCustomImage('');
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

      showSnackbar.success('卡片下载成功');
    } catch (error) {
      console.error('下载卡片失败:', error);
      showSnackbar.error('下载卡片失败，请稍后重试');
    } finally {
      setIsDownloading(false);
    }
  };

  // 提交卡片
  const submitCard = async () => {
    // 验证必填字段
    if (!cardData.title.trim()) {
      showSnackbar.warning('请输入标题');
      return;
    }
    if (!cardData.quote.trim()) {
      showSnackbar.warning('请输入触动你的观点');
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
        showSnackbar.success('卡片提交成功！');
        // 重置表单
        resetForm();
        // 重新加载轮播卡片
        loadLatestCardsCarousel();
      } else {
        throw new Error(response.error || '提交失败');
      }
    } catch (error) {
      console.error('提交卡片失败:', error);
      showSnackbar.error('提交失败，请稍后重试');
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
        showSnackbar.error('获取卡片失败');
        return;
      }
      const list = response.data?.records || [];

      setCarouselCards(list);
    } catch (error) {
      console.error('加载最新卡片失败:', error);

      setCarouselCards([]);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h4"
            align="center"
            sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}
          >
            创造你的启发时刻卡片
          </Typography>
        </Box>

        <Box className={styles['main-content']}>
          <Grid
            container
            spacing={4}
            sx={{
              width: '100%',
              borderRadius: 2,
              bgcolor: 'white',
              p: 4,
            }}
          >
            <Grid size={{ xs: 12, md: 6 }}>
              {/* 第一行：标题 */}
              <Box className={styles['form-row']} sx={{ gap: 2, mb: 3 }}>
                <FormControl fullWidth>
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
                <Box className={`${styles['gradient-selector']} card`}>
                  {gradientOptions.map((option) => (
                    <div
                      key={option.class}
                      data-gradient={option.class}
                      className={`${styles['gradient-option']}  gradient-option`}
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
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📷 选择本地图片
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={searchImagesFromDetail}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <CircularProgress
                        size={20}
                        color="inherit"
                        sx={{ mr: 1 }}
                      />
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
                  <Box className={styles['image-grid']}>
                    {searchImages.map((image, index) => (
                      <Box
                        key={index}
                        className={`${styles['image-item']} ${
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
                        <Box className={styles['image-overlay']}>
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
                  variant="contained"
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
                  variant="contained"
                  onClick={downloadCardImage}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <CircularProgress
                      size={20}
                      color="inherit"
                      sx={{ mr: 1 }}
                    />
                  ) : null}
                  下载卡片
                </Button>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box id="preview" ref={previewRef} className={styles.cardPreview}>
                {/* 卡片预览 */}
                <MuiCard
                  className={`card ${cardData.gradientClass}`}
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
                      )?.class || '#f5f5f5',
                  }}
                >
                  <CardContent
                    sx={{
                      flexGrow: 1,
                      color: getFontColorForGradient(
                        cardData?.gradientClass || ''
                      ),
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
                            cardData?.gradientClass || ''
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
                            cardData?.gradientClass || ''
                          ),
                          '& *': {
                            color: 'inherit !important',
                          },
                        }}
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(
                            cardData.detail
                              ? marked.parse(cardData.detail).toString()
                              : ''
                          ),
                        }}
                      />
                    )}
                  </CardContent>
                  <CardActions
                    sx={{
                      justifyContent: 'center',
                      color: getFontColorForGradient(
                        cardData?.gradientClass || ''
                      ),
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
            <Typography
              variant="h5"
              component="h2"
              gutterBottom
              align="center"
              sx={{ color: '#1976d2' }}
            >
              展示区
            </Typography>

            <Box className={styles['image-grid']}>
              {carouselCards.slice(0, 3).map((item) => (
                <InspireCard
                  key={item.id || Math.random()}
                  card={{
                    id: item.id || '',
                    title: item.title || '这一刻，我想说...',
                    quote: item.quote || '',
                    detail: item.detail || '',
                    imagePath: item.imagePath || '',
                    gradientClass: item.gradientClass || '',
                    creator: item.creator || '',
                    created: item.created || new Date().toISOString(),
                    font: item.font || 'sans-serif',
                  }}
                  canComment={false} // 轮播区域不需要评论功能
                  onCardClick={(id) => navigate(`/card/detail/${id}`)}
                  onSubmitComment={() => {}}
                />
              ))}
            </Box>

            <Box className={styles['view-all-button-container']}>
              <a
                href="/cards"
                className={styles['view-all-button']}
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
