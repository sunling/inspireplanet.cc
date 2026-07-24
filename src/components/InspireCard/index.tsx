import React from 'react';
import { Box, Typography, Card, IconButton, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

import { CardItem } from '../../netlify/types';
import { getFontColorForGradient } from '@/constants/gradient';
import useResponsive from '@/hooks/useResponsive';
import TextCollapse from '../TextCollapse';

interface InspireCardProps {
  card: CardItem;
  canEdit?: boolean;
  onCardClick: (id: string) => void;
  onEdit?: (id: string) => void;
}

const InspireCard: React.FC<InspireCardProps> = ({
  card,
  onCardClick,
  canEdit = false,
  onEdit,
}) => {
  marked.setOptions({ breaks: true });

  const { isMobile } = useResponsive();
  const gradientClass = card.gradient_class || 'card-gradient-1';
  const fontColor = getFontColorForGradient(gradientClass);
  const quoteBoxBg = `${fontColor}10`;

  const finalImage = card.image_path || card.upload;

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
        className={gradientClass}
        sx={{
          color: fontColor,
          fontFamily: 'sans-serif',
          borderRadius: '16px',
          padding: 2.5,
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.28)',
          boxShadow: '0 8px 24px rgba(75, 55, 42, 0.08)',
        }}
      >
        {card.is_private && (
          <Chip
            icon={<LockOutlinedIcon />}
            label="仅自己可见"
            size="small"
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 1,
              bgcolor: 'rgba(255,255,255,0.86)',
              color: '#5f554c',
            }}
          />
        )}
        {/* 卡片图片 */}
        {finalImage && (
          <Box
            component="img"
            src={finalImage}
            alt={card.title || '卡片图片'}
            loading="lazy"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.src = '/images/mistyblue.png';
            }}
            sx={{
              width: '100%',
              maxWidth: '80vw',
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
            sx={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 600,
              lineHeight: 1.4,
              mb: 1,
              color: fontColor,
            }}
          >
            {card.title}
          </Typography>
          <Typography variant="caption" sx={{ color: fontColor, opacity: 0.7 }}>
            {formatCardDate(card.created || '')}
          </Typography>
        </Box>

        {/* 卡片引言 */}
        <Box
          sx={{
            backgroundColor: quoteBoxBg,
            padding: 2,
            borderRadius: '10px',
            mb: 2,
            position: 'relative',
            pl: 4,
            '&::before': {
              content: '"“"',
              position: 'absolute',
              left: 8,
              top: -10,
              fontSize: '2.2rem',
              lineHeight: 1,
              color: fontColor,
              opacity: 0.2,
            },
          }}
        >
          <Typography
            variant="body1"
            component="div"
            sx={{
              fontStyle: 'italic',
              color: fontColor,
              whiteSpace: 'pre-line',
              lineHeight: 1.75,
            }}
          >
            <TextCollapse
              html={DOMPurify.sanitize(
                card.quote ? marked.parse(card.quote).toString() : ''
              )}
              maxLines={8}
            />
          </Typography>
        </Box>

        {/* 卡片详情 */}
        {card.detail && (
          <Box sx={{ color: fontColor, lineHeight: 1.7 }}>
            <TextCollapse
              html={DOMPurify.sanitize(
                card.detail ? marked.parse(card.detail).toString() : ''
              )}
              maxLines={8}
            />
          </Box>
        )}

        {/* 卡片创作者 */}
        {card.creator && (
          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 500, color: fontColor, opacity: 0.78 }}
            >
              — {card.creator}
            </Typography>
          </Box>
        )}
      </Card>

      {canEdit && onEdit && (
        <Box sx={{ mt: 0.5 }}>
          <IconButton
            aria-label="编辑卡片"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(card.id);
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default InspireCard;
