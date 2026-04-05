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
import { useGlobalSnackbar } from '@/context/app';
import { imagesApi } from '../../netlify/config';

const CoverEditor: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverPreviewRef = useRef<HTMLDivElement>(null);

  // 状态管理
  const [title, setTitle] = useState<string>('启发星球');
  const [keywords, setKeywords] = useState<string>('灵感 创意 分享');
  const [fontFamily, setFontFamily] = useState<string>(
    "'Noto Sans SC', sans-serif"
  );
  const [titleFontSize, setTitleFontSize] = useState<number>(48);
  const [keywordsFontSize, setKeywordsFontSize] = useState<number>(24);
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
      // 使用统一的api对象搜索图片
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

      setSearchQuery(searchText);
      setSearchImages(data);
      setShowSearchResults(true);
      setSearchStatus('');
    } catch (error) {
      console.error('搜索图片失败:', error);
      setSearchStatus(
        `搜索失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
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
        link.download = `封面_${new Date().getTime()}.png`;
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
    setTitleFontSize(48);
    setKeywordsFontSize(24);
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'var(--bg-light)', py: 4 }}>
      <Container maxWidth="lg">
        <Typography
          variant="h4"
          component="h1"
          sx={{
            mb: 4,
            textAlign: 'center',
            fontWeight: 'bold',
            color: 'var(--text)',
          }}
        >
          封面编辑器
        </Typography>

        <Grid container spacing={4}>
          {/* 表单部分 */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 3, color: '#555' }}>
                设计选项
              </Typography>

              <TextField
                fullWidth
                label="封面标题"
                multiline
                rows={3}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入封面标题..."
                margin="normal"
              />
              <Typography
                variant="caption"
                sx={{ color: '#7f8c8d', display: 'block', mb: 2 }}
              >
                按回车换行
              </Typography>

              <TextField
                fullWidth
                label="关键词"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="用空格分隔关键词"
                margin="normal"
              />

              <Grid container spacing={2} sx={{ my: 2 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>字体选择</InputLabel>
                    <Select
                      value={fontFamily}
                      label="字体选择"
                      onChange={(e) => setFontFamily(e.target.value)}
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
                  <FormControl fullWidth>
                    <InputLabel>布局风格</InputLabel>
                    <Select
                      value={layout}
                      label="布局风格"
                      onChange={(e) => setLayout(e.target.value)}
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

              <Grid container spacing={2} sx={{ my: 2 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="标题字体大小"
                    type="number"
                    value={titleFontSize}
                    onChange={(e) => setTitleFontSize(Number(e.target.value))}
                    inputProps={{ min: 12, max: 120, step: 2 }}
                    margin="normal"
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
                    inputProps={{ min: 8, max: 60, step: 1 }}
                    margin="normal"
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ my: 2 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="标题字体颜色"
                    type="color"
                    value={titleColor}
                    onChange={(e) => setTitleColor(e.target.value)}
                    margin="normal"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="关键词字体颜色"
                    type="color"
                    value={keywordsColor}
                    onChange={(e) => setKeywordsColor(e.target.value)}
                    margin="normal"
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2} sx={{ my: 2 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>背景图片</InputLabel>
                    <Select
                      value={bgSelect}
                      label="背景图片"
                      onChange={(e) => setBgSelect(e.target.value)}
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
                    {uploadStatus && (
                      <Typography
                        variant="caption"
                        sx={{
                          mt: 1,
                          display: 'block',
                          color: 'var(--text-light)',
                        }}
                      >
                        {uploadStatus}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
              </Grid>

              <Box sx={{ my: 3 }}>
                <Button
                  variant="contained"
                  onClick={searchImagesHandler}
                  disabled={searching}
                  startIcon={
                    searching ? <CircularProgress size={16} /> : <span>🔍</span>
                  }
                  sx={{ mr: 2 }}
                >
                  搜索相关图片
                </Button>
                {searchStatus && (
                  <Typography
                    variant="body2"
                    sx={{
                      ml: 1,
                      display: 'inline',
                      color: 'var(--text-light)',
                      ...(searching && { fontWeight: 'bold' }),
                    }}
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
                  }}
                >
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    搜索结果：{searchQuery}
                  </Typography>
                  <Grid container spacing={2}>
                    {searchImages.map((image, index) => (
                      <Grid size={{ xs: 6, sm: 4 }} key={index}>
                        <Card
                          sx={{
                            cursor: 'pointer',
                            '&:hover': { boxShadow: 2 },
                            transition: 'box-shadow 0.2s',
                          }}
                          onClick={() => selectImage(image.url)}
                        >
                          <CardMedia
                            component="img"
                            height="80"
                            image={image.thumb}
                            alt={image.title}
                          />
                          <CardContent>
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
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 3, color: '#555' }}>
                预览
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: { xs: '400px', sm: '500px' },
                }}
              >
                <Box
                  className="cover"
                  ref={coverPreviewRef}
                  sx={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: { xs: '300px', sm: '400px', md: '500px' },
                    aspectRatio: '16/9',
                    overflow: 'hidden',
                    borderRadius: 2,
                    boxShadow: 3,
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url('${getBgImage()}')`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0,0,0,0.2)',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: layout === 'left' ? 'flex-start' : 'center',
                      padding: '2rem',
                      fontFamily: fontFamily,
                      textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  >
                    <Typography
                      variant="h3"
                      component="div"
                      sx={{
                        fontWeight: 'bold',
                        mb: 2,
                        textAlign: layout === 'left' ? 'left' : 'center',
                        wordBreak: 'break-word',
                        fontFamily: fontFamily,
                        fontSize: `${titleFontSize}px`,
                        color: titleColor,
                      }}
                    >
                      {formatTitle(title)}
                    </Typography>
                    <Typography
                      variant="h6"
                      component="div"
                      sx={{
                        opacity: 0.9,
                        textAlign: layout === 'left' ? 'left' : 'center',
                        fontFamily: fontFamily,
                        fontSize: `${keywordsFontSize}px`,
                        color: keywordsColor,
                      }}
                    >
                      {formatKeywords(keywords)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box
                sx={{
                  mt: 4,
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 2,
                }}
              >
                <Button
                  variant="contained"
                  onClick={downloadCover}
                  size="large"
                  sx={{ textTransform: 'none', px: 4 }}
                >
                  下载
                </Button>
                <Button
                  variant="outlined"
                  onClick={resetForm}
                  size="large"
                  sx={{ textTransform: 'none', px: 4 }}
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

export default CoverEditor;
