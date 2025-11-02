import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

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

// 卡片数据接口
interface CardData {
  id: string;
  title: string;
  quote: string;
  detail: string;
  creator: string;
  gradientClass: string;
  font: string;
  imagePath?: string;
  createdAt?: string;
}

const CardEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMedium = useMediaQuery(theme.breakpoints.down('md'));

  // 表单状态
  const [cardData, setCardData] = useState<CardData>({
    id: id || '',
    title: '',
    quote: '',
    detail: '',
    creator: '',
    gradientClass: 'card-gradient-1',
    font: 'Noto Sans SC',
    imagePath: '',
  });

  // UI状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 模拟获取卡片数据
  useEffect(() => {
    const fetchCardData = async () => {
      try {
        setLoading(true);
        // 在实际应用中，这里应该是API调用
        // 模拟API延迟
        const response = await fetch(`/netlify/functions/fetchCard?id=${id}`);
        const data = await response.json();

        setCardData(data);
        setError('');
      } catch (err) {
        setError('获取卡片数据失败，请稍后重试');
        console.error('获取卡片数据失败:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCardData();
    } else {
      setLoading(false);
      setError('卡片ID不存在');
    }
  }, [id]);

  // 处理表单输入变化
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setCardData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      // 在实际应用中，这里应该是API调用
      // 模拟API延迟
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('保存卡片数据:', cardData);
      // 保存成功后返回卡片详情页
      navigate(`/card-detail?id=${id}`);
    } catch (err) {
      setError('保存卡片失败，请稍后重试');
      console.error('保存卡片失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 处理返回
  const handleBack = () => {
    navigate(-1);
  };

  // 渲染卡片预览
  const renderCardPreview = () => {
    // 将Markdown转换为HTML并进行净化 - 使用marked.parse的同步版本
    const markdownHtml = marked.parse(cardData.detail || '', { async: false });
    const sanitizedDetail = DOMPurify.sanitize(markdownHtml, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    });
    const fontColor = getFontColorForGradient(cardData.gradientClass);

    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
        <Paper
          elevation={3}
          className={cardData.gradientClass}
          sx={{
            color: fontColor,
            borderRadius: '12px',
            overflow: 'hidden',
            maxWidth: isMobile ? '95%' : '100%',
            width: '100%',
          }}
        >
          <Box
            sx={{
              p: 4,
              fontFamily: cardData.font,
            }}
          >
            <Typography
              variant="h4"
              component="h2"
              sx={{
                mb: 2,
                fontWeight: 'bold',
                fontFamily: cardData.font,
              }}
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
            {cardData.imagePath && (
              <Box
                component="img"
                src={cardData.imagePath}
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
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            ✏️ 雕琢你的灵感
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* 表单部分 */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
              {loading && id ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress size={48} />
                </Box>
              ) : error ? (
                <Alert severity="error" sx={{ my: 2 }}>
                  {error}
                </Alert>
              ) : (
                <form id="edit-form" onSubmit={handleSubmit}>
                  <TextField
                    fullWidth
                    label="标题"
                    id="title"
                    name="title"
                    placeholder="请输入卡片标题"
                    value={cardData.title}
                    onChange={handleInputChange}
                    required
                    margin="normal"
                  />

                  <TextField
                    fullWidth
                    label="金句"
                    id="quote"
                    name="quote"
                    placeholder="请输入触动你的金句"
                    value={cardData.quote}
                    onChange={handleInputChange}
                    required
                    margin="normal"
                  />

                  <TextField
                    fullWidth
                    label="启发详情"
                    id="detail"
                    name="detail"
                    placeholder="请详细描述这个观点给你带来的启发和你的行动计划"
                    value={cardData.detail}
                    onChange={handleInputChange}
                    required
                    multiline
                    rows={6}
                    margin="normal"
                  />

                  <TextField
                    fullWidth
                    label="创作者"
                    id="creator"
                    name="creator"
                    placeholder="请输入创作者名称"
                    value={cardData.creator}
                    onChange={handleInputChange}
                    margin="normal"
                  />

                  <FormControl fullWidth margin="normal">
                    <InputLabel>背景渐变</InputLabel>
                    <Select
                      id="gradientClass"
                      name="gradientClass"
                      value={cardData.gradientClass}
                      label="背景渐变"
                      onChange={(e) =>
                        handleInputChange(
                          e as React.ChangeEvent<
                            | HTMLInputElement
                            | HTMLTextAreaElement
                            | HTMLSelectElement
                          >
                        )
                      }
                    >
                      <MenuItem value="card-gradient-1">渐变1</MenuItem>
                      <MenuItem value="card-gradient-2">渐变2</MenuItem>
                      <MenuItem value="card-gradient-3">渐变3</MenuItem>
                      <MenuItem value="card-gradient-4">渐变4</MenuItem>
                      <MenuItem value="card-gradient-5">渐变5</MenuItem>
                      <MenuItem value="card-gradient-6">渐变6</MenuItem>
                      <MenuItem value="card-gradient-7">渐变7</MenuItem>
                      <MenuItem value="card-gradient-8">渐变8</MenuItem>
                      <MenuItem value="card-gradient-9">渐变9</MenuItem>
                      <MenuItem value="card-gradient-10">渐变10</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth margin="normal">
                    <InputLabel>字体</InputLabel>
                    <Select
                      id="font"
                      name="font"
                      value={cardData.font}
                      label="字体"
                      onChange={(e) =>
                        handleInputChange(
                          e as React.ChangeEvent<
                            | HTMLInputElement
                            | HTMLTextAreaElement
                            | HTMLSelectElement
                          >
                        )
                      }
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
                      <MenuItem value="Dancing Script">Dancing Script</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth margin="normal">
                    <InputLabel>背景图片</InputLabel>
                    <Select
                      id="imagePath"
                      name="imagePath"
                      value={cardData.imagePath || ''}
                      label="背景图片"
                      onChange={(e) =>
                        handleInputChange(
                          e as React.ChangeEvent<
                            | HTMLInputElement
                            | HTMLTextAreaElement
                            | HTMLSelectElement
                          >
                        )
                      }
                    >
                      <MenuItem value="">无背景图片</MenuItem>
                    </Select>
                  </FormControl>

                  <Box
                    sx={{
                      mt: 4,
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 2,
                    }}
                  >
                    <Button
                      variant="outlined"
                      onClick={handleBack}
                      size="large"
                      sx={{ px: 3 }}
                    >
                      取消
                    </Button>
                    <Button
                      variant="contained"
                      type="submit"
                      disabled={loading}
                      size="large"
                      sx={{ px: 4 }}
                    >
                      保存修改
                    </Button>
                  </Box>
                </form>
              )}
            </Paper>
          </Grid>

          {/* 预览部分 */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                实时预览
              </Typography>
              {renderCardPreview()}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default CardEdit;
/*
 * @Author: your name
 * @Date: 2025-11-01 17:50:03
 * @LastEditTime: 2025-11-01 17:50:04
 * @LastEditors: huili.local
 * @Description: In User Settings Edit
 * @FilePath: /inspireplanet.cc/src/pages/CardEdit.tsx
 */
