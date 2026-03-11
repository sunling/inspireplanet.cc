import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
marked.setOptions({ breaks: true });

import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  IconButton,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import TextareaAutosize from '@mui/material/TextareaAutosize';

import { gradientOptions, getFontColorForGradient } from '@/constants/gradient';
import {
  CardItem,
  SearchImageItem,
  SearchImageResult,
} from '../../netlify/types';
import { useGlobalSnackbar } from '@/context/app';
import useResponsive from '@/hooks/useResponsive';
import { imagesApi } from '../../../netlify/config';

import styles from '../CardCreate/index.module.css';

// 暴露给父组件的 ref 类型
export interface EditFormRef {
  getPreviewElement: () => HTMLDivElement | null;
}

interface EditFormProps {
  // 初始卡片数据
  initialCardData: CardItem;
  // 提交按钮文本
  submitButtonText: string;
  // 页面标题
  pageTitle: string;
  // 页面描述
  pageDescription?: string;
  // 是否显示返回按钮
  showBackButton?: boolean;
  // 是否处于加载状态（用于编辑模式获取数据）
  isLoading?: boolean;
  // 错误信息
  error?: string;
  // 提交卡片的回调函数
  onSubmit: (
    cardData: CardItem,
    imageData?: { customImage?: string; selectedSearchImage?: string }
  ) => Promise<void>;
  // 返回按钮的回调函数
  onBack?: () => void;
  // 是否显示下载按钮
  showDownloadButton?: boolean;
  // 下载卡片的回调函数
  onDownload?: () => Promise<void>;
}

const EditForm = forwardRef<EditFormRef, EditFormProps>(
  (
    {
      initialCardData,
      submitButtonText,
      pageTitle,
      pageDescription,
      showBackButton = false,
      isLoading = false,
      error = '',
      onSubmit,
      onBack,
      showDownloadButton = false,
      onDownload,
    },
    ref
  ) => {
    const { isMobile } = useResponsive();
    const showSnackbar = useGlobalSnackbar();
    const previewRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 卡片数据状态
    const [cardData, setCardData] = useState<CardItem>(initialCardData);

    // 图片相关状态
    const [customImage, setCustomImage] = useState<string>('');
    const [selectedSearchImage, setSelectedSearchImage] = useState<string>('');
    const [searchImages, setSearchImages] = useState<SearchImageResult[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchError, setSearchError] = useState<string>('');
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [fileStatus, setFileStatus] = useState<string>('');
    const [showSearchResults, setShowSearchResults] = useState<boolean>(false);

    // 提交状态
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);

    // 暴露 ref 给父组件
    useImperativeHandle(ref, () => ({
      getPreviewElement: () => previewRef.current,
    }));

    // 当初始数据变化时更新卡片数据
    useEffect(() => {
      setCardData(initialCardData);
      // 如果有图片路径，设置为选中的搜索图片
      if (initialCardData.image_path) {
        setSelectedSearchImage(initialCardData.image_path);
      }
    }, [initialCardData]);

    // 处理输入变化
    const handleInputChange = (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name, value } = e.target;
      setCardData((prev) => ({ ...prev, [name]: value }));
    };

    // 处理渐变选择
    const handleGradientSelect = (gradient_class: string) => {
      setCardData((prev) => ({ ...prev, gradient_class }));
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
        const query = combinedText.substring(0, 200);
        setSearchQuery(query);

        // 调用图片搜索API
        const response = await imagesApi.search(query);

        if (!response.success) {
          showSnackbar.error(response.error || '搜索图片失败');
          return;
        }

        if (response.data?.images?.length) {
          // 格式化搜索结果为SearchImageResult类型
          const formattedResults: SearchImageResult[] =
            response.data.images.map((item: SearchImageItem) => ({
              url: item.url || '',
              thumb: item.thumb || item.url || '',
              title: item.title || '图片',
              description: item.description || '相关图片',
            }));

          setSearchImages(formattedResults);
          setShowSearchResults(true);
        } else {
          showSnackbar.info('未找到相关图片');
        }
      } catch (error) {
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
      if (!previewRef.current || !onDownload) return;

      setIsDownloading(true);
      try {
        await onDownload();
      } catch (error) {
        showSnackbar.error('下载卡片失败，请稍后重试');
      } finally {
        setIsDownloading(false);
      }
    };

    // 提交卡片
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      // 验证必填字段
      if (!cardData.title?.trim()) {
        showSnackbar.warning('请输入标题');
        return;
      }
      if (!cardData.quote?.trim()) {
        showSnackbar.warning('请输入触动你的观点');
        return;
      }

      setIsSubmitting(true);
      try {
        // 前端净化输入，防止注入攻击
        const sanitizedTitle = DOMPurify.sanitize(cardData.title);
        const sanitizedQuote = DOMPurify.sanitize(cardData.quote);
        const sanitizedDetail = DOMPurify.sanitize(cardData.detail || '');

        const cardToSubmit = {
          ...cardData,
          title: sanitizedTitle,
          quote: sanitizedQuote,
          detail: sanitizedDetail,
        };

        await onSubmit(cardToSubmit, {
          customImage,
          selectedSearchImage,
        });
      } catch (error) {
        showSnackbar.error('提交失败，请稍后重试');
      } finally {
        setIsSubmitting(false);
      }
    };

    // 渲染卡片预览
    const renderCardPreview = () => {
      // 将Markdown转换为HTML并进行净化
      const markdownHtml = marked.parse(cardData.detail || '', {
        async: false,
      });
      const sanitizedDetail = DOMPurify.sanitize(markdownHtml, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
      });
      const fontColor = getFontColorForGradient(cardData.gradient_class!);

      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <Paper
            elevation={3}
            className={cardData.gradient_class}
            sx={{
              color: fontColor,
              borderRadius: '12px',
              overflow: 'hidden',
              maxWidth: isMobile ? '95%' : '100%',
              width: '100%',
            }}
          >
            <Box sx={{ p: 4, fontFamily: cardData.font }}>
              <Typography
                variant="h4"
                component="h2"
                sx={{ mb: 2, fontWeight: 'bold', fontFamily: cardData.font }}
              >
                {cardData.title || '标题'}
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  backgroundColor: `${fontColor}10`,
                  borderRadius: '8px',
                  fontFamily: cardData.font,
                }}
              >
                <Typography variant="h6" sx={{ fontFamily: cardData.font }}>
                  {cardData.quote || '金句'}
                </Typography>
              </Paper>
              {(customImage || selectedSearchImage) && (
                <Box
                  component="img"
                  src={customImage || selectedSearchImage}
                  alt={cardData.title || '标题'}
                  sx={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '8px',
                    mb: 3,
                  }}
                />
              )}
              <Box
                sx={{ fontFamily: cardData.font }}
                dangerouslySetInnerHTML={{ __html: sanitizedDetail }}
              />
            </Box>
            <Box
              sx={{
                p: 2,
                textAlign: 'right',
                borderTop: `1px solid ${fontColor}30`,
                fontFamily: cardData.font,
              }}
            >
              {cardData.creator && (
                <Typography variant="body2">— {cardData.creator}</Typography>
              )}
            </Box>
          </Paper>
        </Box>
      );
    };

    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-light)', py: 4 }}>
        <Box sx={{ maxWidth: 'lg', mx: 'auto', px: 3 }}>
          {/* 页面标题 */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
            {showBackButton && onBack && (
              <IconButton onClick={onBack} sx={{ mr: 2 }}>
                <ArrowBack />
              </IconButton>
            )}
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              {pageTitle}
            </Typography>
          </Box>

          {pageDescription && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              {pageDescription}
            </Typography>
          )}

          <Grid container spacing={4}>
            {/* 表单部分 */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
                {isLoading ? (
                  <Box
                    sx={{ display: 'flex', justifyContent: 'center', py: 8 }}
                  >
                    <CircularProgress size={48} />
                  </Box>
                ) : error ? (
                  <Typography variant="body2" color="error" sx={{ my: 2 }}>
                    {error}
                  </Typography>
                ) : (
                  <form onSubmit={handleSubmit}>
                    {/* 创作者和标题 */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                      <FormControl fullWidth>
                        <Typography variant="subtitle2" gutterBottom>
                          创作者
                        </Typography>
                        <TextField
                          name="creator"
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
                          name="title"
                          placeholder="这一刻，我想说..."
                          value={cardData.title}
                          onChange={handleInputChange}
                          variant="outlined"
                          fullWidth
                          size="small"
                          required
                        />
                      </FormControl>
                    </Box>

                    {/* 触动你的观点 */}
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
                      <TextareaAutosize
                        name="quote"
                        placeholder="写下让你触动的一句话、一段对话、或一个片段..."
                        value={cardData.quote}
                        onChange={handleInputChange}
                        minRows={3}
                        className={styles.softTextarea}
                        required
                      />
                    </FormControl>

                    {/* 你的启发 */}
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
                      <TextareaAutosize
                        name="detail"
                        placeholder="写下你的启发和行动吧..."
                        value={cardData.detail}
                        onChange={handleInputChange}
                        minRows={5}
                        className={styles.softTextarea}
                      />
                    </FormControl>

                    {/* 背景渐变选择 */}
                    <FormControl fullWidth sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        选择背景
                      </Typography>
                      <Box className={`${styles['gradient-selector']} card`}>
                        {gradientOptions.map((option) => (
                          <div
                            key={option.class}
                            data-gradient={option.class}
                            className={`${styles['gradient-option']} gradient-option ${
                              cardData.gradient_class === option.class
                                ? styles.selected
                                : ''
                            }`}
                            title={option.title}
                            onClick={() => handleGradientSelect(option.class)}
                          />
                        ))}
                      </Box>
                    </FormControl>

                    {/* 字体选择 */}
                    <FormControl fullWidth sx={{ mb: 3 }}>
                      <InputLabel>字体</InputLabel>
                      <Select
                        name="font"
                        value={cardData.font}
                        label="字体"
                        onChange={handleInputChange}
                      >
                        <MenuItem value="Noto Sans SC">思源黑体</MenuItem>
                        <MenuItem value="Noto Serif SC">思源宋体</MenuItem>
                        <MenuItem value="Ma Shan Zheng">马善政楷体</MenuItem>
                        <MenuItem value="Inter">Inter</MenuItem>
                        <MenuItem value="Playfair Display">
                          Playfair Display
                        </MenuItem>
                        <MenuItem value="Montserrat">Montserrat</MenuItem>
                        <MenuItem value="Lato">Lato</MenuItem>
                        <MenuItem value="Dancing Script">
                          Dancing Script
                        </MenuItem>
                      </Select>
                    </FormControl>

                    {/* 图片上传 */}
                    <FormControl fullWidth sx={{ mb: 4 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        添加背景图片
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 2,
                          flexWrap: 'wrap',
                          mb: 1,
                        }}
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
                          onClick={() => fileInputRef.current?.click()}
                        >
                          选择本地图片
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
                          border: '1px solid rgba(0, 0, 0, 0.05)',
                          borderRadius: 'var(--radius)',
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

                    {/* 操作按钮 */}
                    <Box
                      sx={{
                        mt: 4,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 2,
                      }}
                    >
                      {showBackButton && onBack && (
                        <Button
                          variant="outlined"
                          onClick={onBack}
                          size="large"
                          sx={{ px: 3 }}
                        >
                          取消
                        </Button>
                      )}
                      {showDownloadButton && onDownload && (
                        <Button
                          variant="outlined"
                          onClick={downloadCardImage}
                          disabled={isDownloading}
                          size="large"
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
                      )}
                      <Button
                        variant="contained"
                        type="submit"
                        disabled={isSubmitting}
                        size="large"
                        sx={{ px: 4 }}
                      >
                        {isSubmitting ? (
                          <CircularProgress
                            size={20}
                            color="inherit"
                            sx={{ mr: 1 }}
                          />
                        ) : null}
                        {submitButtonText}
                      </Button>
                    </Box>
                  </form>
                )}
              </Paper>
            </Grid>

            {/* 预览部分 */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={2}
                sx={{ p: 3, borderRadius: 2, height: '100%' }}
              >
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                  实时预览
                </Typography>
                <Box ref={previewRef}>{renderCardPreview()}</Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>
    );
  }
);

EditForm.displayName = 'EditForm';

export default EditForm;
