import React, { useState } from 'react';
import { Box, Typography, Button, TextField, Card } from '@mui/material';

import { CardItem } from '@/netlify/types';
import { getFontColorForGradient, gradientStyles } from '@/constants/gradient';
import useResponsive from '@/hooks/useResponsive';

interface InspireCardProps {
  card: CardItem;
  canComment?: boolean;
  onCardClick: (id: string) => void;
  onSubmitComment: (id: string, name: string, comment: string) => void;
}

const InspireCard: React.FC<InspireCardProps> = ({
  card,
  onCardClick,
  canComment = true,
  onSubmitComment,
}) => {
  const [showCommentForm, setShowCommentForm] = useState<boolean>(canComment);
  const [commentName, setCommentName] = useState<string>('');
  const [commentText, setCommentText] = useState<string>('');
  const { isMobile } = useResponsive();

  // 获取字体颜色和渐变样式
  const fontColor = getFontColorForGradient(
    card.gradientClass || 'card-gradient-1'
  );
  const gradientStyle =
    gradientStyles[card.gradientClass || 'card-gradient-1'] || {};

  // Quote box背景色
  const quoteBoxBg = 'rgba(255, 255, 255, 0.9)';

  // 最终图片路径，使用默认图片如果没有提供
  const finalImage = card.imagePath || '/images/mistyblue.png';

  // 格式化创建日期
  const formatCardDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Box
      sx={{
        position: 'relative',
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          transform: 'translateY(-4px)',
          transition: 'transform 0.3s ease',
        },
      }}
      onClick={() => onCardClick(card.id)}
    >
      <Card
        sx={{
          color: fontColor,
          fontFamily: 'sans-serif',
          borderRadius: '8px',
          padding: 2,
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          ...gradientStyle,
        }}
      >
        {/* 卡片图片 */}
        {finalImage && (
          <Box
            component="img"
            src={finalImage}
            alt={card.title || '卡片图片'}
            loading="lazy"
            sx={{
              width: '100%',
              height: 'auto',
              borderRadius: '4px',
              mb: 2,
            }}
          />
        )}

        {/* 卡片标题 */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant={isMobile ? 'h6' : 'h5'}
            sx={{ fontWeight: 'bold', mb: 1 }}
          >
            {card.title}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            {formatCardDate(card.created || '')}
          </Typography>
        </Box>

        {/* 卡片引言 */}
        <Box
          sx={{
            backgroundColor: quoteBoxBg,
            padding: 2,
            borderRadius: 'var(--radius-sm)',
            mb: 2,
            color: 'var(--text)',
          }}
        >
          <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
            "{card.quote || ''}"
          </Typography>
        </Box>

        {/* 卡片详情 */}
        {card.detail && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2">{card.detail}</Typography>
          </Box>
        )}

        {/* 卡片创作者 */}
        {card.creator && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
              — {card.creator}
            </Typography>
          </Box>
        )}
      </Card>

      {/* 卡片操作区域 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 'var(--spacing-md)',
          opacity: 0,
          '&:hover': {
            opacity: 1,
            transition: 'opacity 0.3s ease',
          },
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="contained"
          color="primary"
          size={isMobile ? 'small' : 'medium'}
          sx={{ mb: 2 }}
          onClick={() => onCardClick(card.id)}
        >
          查看详情
        </Button>

        {showCommentForm && (
          <Box
            sx={{
              width: '100%',
              backgroundColor: 'white',
              padding: 2,
              borderRadius: '4px',
              mb: 2,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, color: 'var(--text)', fontWeight: 'bold' }}
            >
              添加评论
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="你的名字"
              value={commentName}
              onChange={(e) => setCommentName(e.target.value)}
              margin="dense"
              onClick={(e) => e.stopPropagation()}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              size="small"
              placeholder="写下你的想法..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              margin="dense"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="contained"
              color="primary"
              fullWidth
              size="small"
              onClick={() => onSubmitComment(card.id, commentName, commentText)}
            >
              提交评论
            </Button>
          </Box>
        )}

        <Button
          variant="contained"
          color="success"
          size={isMobile ? 'small' : 'medium'}
          onClick={(e) => {
            e.stopPropagation();
            setShowCommentForm(!showCommentForm);
          }}
        >
          {showCommentForm ? '取消' : '添加评论'}
        </Button>
      </Box>
    </Box>
  );
};

export default InspireCard;
