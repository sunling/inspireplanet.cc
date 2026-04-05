import React, { useState, useRef } from 'react';

import html2canvas from 'html2canvas';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Grid,
  Paper,
  CircularProgress,
  Card,
  CardMedia,
  CardContent,
} from '@mui/material';
import useResponsive from '@/hooks/useResponsive';

import { useGlobalSnackbar } from '@/context/app';
import { imagesApi } from '../../netlify/config';

const CoverEditorMobile: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverPreviewRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useResponsive();

  // 状态管理
  const [title, setTitle] = useState<string>('启发星球');
  const [keywords, setKeywords] = useState<string>('灵感 创意 分享');
  const [fontFamily, setFontFamily] = useState<string>(
    "'Noto Sans SC', sans-serif"
  );
  const [titleFontSize, setTitleFontSize] = useState<number>(32);
  const [keywordsFontSize, setKeywordsFontSize] = useState<number>(16);
  const [titleColor, setTitleColor] = useState<string>('#ffffff');
  const [keywordsColor, setKeywordsColor] = useState<string>('#ffffff');
  const [layout, setLayout] = useState<string>('center');
  const [bgSelect, setBgSelect] = useState<string>('images/mistyblue.png');
  const [customBgImage, setCustomBgImage] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchImages, setSearchImages] = useState<any[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const showSnackbar = useGlobalSnackbar();

  // 字体选项
  const fontOptions = [
    { value: "'Noto Sans SC', sans-serif", label: '思源黑体' },
    { value: "'Smiley Sans', sans-serif", label: '得意黑' },
    { value: "'Ma Shan Zheng', cursive", label: '马善政毛笔体' },
    { value: "'LXGW WenKai', serif", label: '霞鹜文楷' },
    { value: "'Alibaba PuHuiTi', sans-serif", label: '阿里汉仪智能黑体' },
    { value: "'Noto Serif SC', serif", label: '思源宋体' },
    { value: "'PingFang SC', sans-serif", label: '苹方' },
    { value: "'KaiTi', serif", label: '楷体' },
  ];

  // 布局选项
  const layoutOptions = [
    { value: 'center', label: '居中排版' },
    { value: 'left', label: '左上排版' },
  ];

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setCustomBgImage(e.target.result as string);
          setUploadStatus(`已上传：${file.name}`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 搜索图片
  const searchImagesHandler = async () => {
    const searchText = `${title} ${keywords}`.trim();

    if (!searchText) {
      alert('请先输入标题或关键词');
      return;
    }

    setSearching(true);
    setSearchStatus('正在搜索相关图片...');
    setShowSearchResults(false);

    try {
      const response = await imagesApi.search(searchText, 'landscape');
      if (!response.success) {
        showSnackbar.error('查询图片失败');
        return;
      }

      const data = response.data?.images || [];

      setSearchQuery(searchText);
      setSearchImages(data);
      setShowSearchResults(true);
      setSearchStatus('');
    } catch (error) {
      console.error('搜索图片失败:', error);
      setSearchStatus(
        `搜索失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
      showSnackbar.error('查询图片失败');
    } finally {
      setSearching(false);
    }
  };

  // 选择搜索结果中的图片
  const selectImage = (imageUrl: string) => {
    setCustomBgImage(imageUrl);
    // 这里可以添加选中效果的逻辑
  };

  // 下载封面
  const downloadCover = () => {
    if (!coverPreviewRef.current) return;

    html2canvas(coverPreviewRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
    })
      .then((canvas) => {
        const link = document.createElement('a');
        link.download = `竖版封面_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL();
        link.click();
      })
      .catch((error) => {
        console.error('下载失败:', error);
        alert('下载失败，请重试');
      });
  };

  // 重置表单
  const resetForm = () => {
    setTitle('启发星球');
    setKeywords('灵感 创意 分享');
    setFontFamily("'Noto Sans SC', sans-serif");
    setTitleFontSize(32);
    setKeywordsFontSize(16);
    setLayout('center');
    setBgSelect('images/mistyblue.png');
    setCustomBgImage('');
    setUploadStatus('');
    setSearchStatus('');
    setShowSearchResults(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 格式化标题（支持换行）
  const formatTitle = (text: string) => {
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // 格式化关键词（空格分隔转为斜杠分隔）
  const formatKeywords = (text: string) => {
    return text
      .split(' ')
      .filter((k) => k.trim())
      .join(' / ');
  };

  // 获取最终的背景图片
  const getBgImage = () => {
    return customBgImage || bgSelect;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'var(--bg-light)',
        py: { xs: 3, md: 6 },
      }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="h4"
          component="h1"
          sx={{
            mb: 4,
            textAlign: 'center',
            fontWeight: 'bold',
            color: '#333',
          }}
        >
          竖版封面编辑器
        </Typography>

        <Grid container spacing={4} direction={isMobile ? 'column' : 'row'}>
          {/* 表单部分 */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper
              elevation={3}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 2,
                bgcolor: 'white',
              }}
            >
              <Typography
                variant="h6"
                component="h2"
                sx={{ mb: 3, color: '#555' }}
              >
                设计参数
              </Typography>

              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  label="封面标题"
                  variant="outlined"
                  multiline
                  rows={3}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入封面标题..."
                  InputProps={{
                    sx: {
                      borderRadius: 1,
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{ color: '#7f8c8d', mt: 1, display: 'block' }}
                >
                  按回车换行
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  label="关键词"
                  variant="outlined"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="用空格分隔关键词"
                  InputProps={{
                    sx: {
                      borderRadius: 1,
                    },
                  }}
                />
              </Box>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth variant="outlined" size="small">
                    <InputLabel>字体选择</InputLabel>
                    <Select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      label="字体选择"
                    >
                      {fontOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth variant="outlined" size="small">
                    <InputLabel>布局风格</InputLabel>
                    <Select
                      value={layout}
                      onChange={(e) => setLayout(e.target.value)}
                      label="布局风格"
                    >
                      {layoutOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="标题字体大小"
                    type="number"
                    value={titleFontSize}
                    onChange={(e) => setTitleFontSize(Number(e.target.value))}
                    inputProps={{ min: 12, max: 80, step: 2 }}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="关键词字体大小"
                    type="number"
                    value={keywordsFontSize}
                    onChange={(e) =>
                      setKeywordsFontSize(Number(e.target.value))
                    }
                    inputProps={{ min: 8, max: 40, step: 1 }}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="标题字体颜色"
                    type="color"
                    value={titleColor}
                    onChange={(e) => setTitleColor(e.target.value)}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="关键词字体颜色"
                    type="color"
                    value={keywordsColor}
                    onChange={(e) => setKeywordsColor(e.target.value)}
                    variant="outlined"
                    size="small"
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth variant="outlined" size="small">
                    <InputLabel>背景图片</InputLabel>
                    <Select
                      value={bgSelect}
                      onChange={(e) => setBgSelect(e.target.value)}
                      label="背景图片"
                    >
                      <MenuItem value="images/mistyblue.png">默认背景</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      自定义背景图
                    </Typography>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => fileInputRef.current?.click()}
                      startIcon={<span>📁</span>}
                      sx={{ textTransform: 'none' }}
                    >
                      上传图片
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ mt: 1, display: 'block' }}
                    >
                      {uploadStatus}
                    </Typography>
                  </FormControl>
                </Grid>
              </Grid>

              <Box sx={{ mb: 3 }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={searchImagesHandler}
                  disabled={searching}
                  startIcon={<span>🔍</span>}
                  sx={{
                    textTransform: 'none',
                    py: 1.2,
                    mb: 1,
                  }}
                >
                  搜索相关图片
                </Button>
                {searching && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      mb: 1,
                    }}
                  >
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    <Typography
                      variant="body2"
                      sx={{ color: 'var(--text-light)' }}
                    >
                      {searchStatus}
                    </Typography>
                  </Box>
                )}
                {!searching && searchStatus && (
                  <Typography
                    variant="body2"
                    color="error"
                    sx={{ textAlign: 'center' }}
                  >
                    {searchStatus}
                  </Typography>
                )}
              </Box>

              {/* 搜索结果 */}
              {showSearchResults && (
                <Box
                  sx={{
                    mt: 3,
                    p: 2,
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                    borderRadius: 1,
                    bgcolor: '#fafafa',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    搜索结果：{searchQuery}
                  </Typography>
                  <Grid container spacing={2}>
                    {searchImages.map((image, index) => (
                      <Grid size={{ xs: 4 }} key={index}>
                        <Card
                          sx={{
                            cursor: 'pointer',
                            '&:hover': { opacity: 0.8, boxShadow: 2 },
                          }}
                          onClick={() => selectImage(image.url)}
                        >
                          <CardMedia
                            component="img"
                            height="80"
                            image={image.thumb}
                            alt={image.title}
                            title={image.description}
                          />
                          <CardContent sx={{ p: 1 }}>
                            <Typography variant="caption" noWrap>
                              {image.title}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* 预览部分 */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper
              elevation={3}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 2,
                bgcolor: 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Typography
                variant="h6"
                component="h2"
                sx={{
                  mb: 3,
                  color: '#555',
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                预览效果
              </Typography>

              <Box
                sx={{
                  width: isMobile ? '100%' : '300px',
                  maxWidth: '300px',
                  mb: 3,
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <div
                  ref={coverPreviewRef}
                  style={{
                    width: '100%',
                    height: '560px',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundImage: `url('${getBgImage()}')`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,

                      right: 0,
                      bottom: 0,
                      bgcolor: 'rgba(0,0,0,0.3)',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent:
                        layout === 'center' ? 'center' : 'flex-start',
                      alignItems: layout === 'center' ? 'center' : 'flex-start',
                      padding: layout === 'center' ? '2rem' : '3rem 2rem 2rem',
                      fontFamily,
                      textAlign: layout === 'center' ? 'center' : 'left',
                    }}
                  >
                    <Typography
                      variant="h4"
                      component="h3"
                      sx={{
                        fontWeight: 'bold',
                        fontSize: `${titleFontSize}px`,
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        mb: layout === 'center' ? 2 : 3,
                        fontFamily,
                        color: titleColor,
                      }}
                    >
                      {formatTitle(title)}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        fontSize: `${keywordsFontSize}px`,
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                        bgcolor: 'rgba(0,0,0,0.3)',
                        px: 2,
                        py: 1,
                        borderRadius: 1,
                        display: 'inline-block',
                        fontFamily,
                        color: keywordsColor,
                      }}
                    >
                      {formatKeywords(keywords)}
                    </Typography>
                  </Box>
                </div>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={downloadCover}
                  sx={{ textTransform: 'none', px: 4, py: 1.2 }}
                >
                  下载
                </Button>
                <Button
                  variant="outlined"
                  onClick={resetForm}
                  sx={{ textTransform: 'none', px: 4, py: 1.2 }}
                >
                  重置
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default CoverEditorMobile;
