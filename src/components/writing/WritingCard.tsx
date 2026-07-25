import React from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import { WritingPost } from '../../netlify/types';
import { formatLocalDateTime } from '../../utils/date';
import HighlightedText from './HighlightedText';

interface WritingCardProps {
  post: WritingPost;
  onClick: (id: string) => void;
}

function getPreview(post: WritingPost): string {
  if (post.body.trim()) return post.body.trim();
  return (
    post.template_snapshot?.items.find((item) => item.answer.trim())?.answer ||
    ''
  );
}

const WritingCard: React.FC<WritingCardProps> = ({ post, onClick }) => {
  const preview = getPreview(post);
  const title =
    post.title || post.template_snapshot?.template_name || '一则自我观察';
  const templateItems =
    post.template_snapshot?.items.filter((item) => item.answer.trim()) || [];

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: '#c9bdb0',
        },
      }}
    >
      <CardActionArea onClick={() => onClick(post.id)} sx={{ height: '100%' }}>
        <CardContent
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            p: 3,
          }}
        >
          {(post.visibility === 'private' || post.template_snapshot) && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 1.5 }}
            >
              {post.visibility === 'private' && (
                <Chip label="仅自己可见" size="small" variant="outlined" />
              )}
              {post.template_snapshot && (
                <Chip
                  label={post.template_snapshot.template_name}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              )}
            </Stack>
          )}

          <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
            {title}
          </Typography>
          {templateItems.length > 0 ? (
            <Stack spacing={1.25} sx={{ minHeight: 100, mb: 2 }}>
              {templateItems.slice(0, 2).map((item) => (
                <Box key={item.key}>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="text.primary"
                    sx={{ display: 'block', mb: 0.25 }}
                  >
                    {item.prompt}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <HighlightedText text={item.answer} />
                  </Typography>
                </Box>
              ))}
              {templateItems.length > 2 && (
                <Typography variant="caption" color="text.disabled">
                  还有 {templateItems.length - 2} 个问题的回答
                </Typography>
              )}
            </Stack>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                whiteSpace: 'pre-wrap',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 5,
                overflow: 'hidden',
                minHeight: 100,
                mb: 2,
              }}
            >
              <HighlightedText text={preview || '还没有正文内容'} />
            </Typography>
          )}

          {post.image_urls.length > 0 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns:
                  post.image_urls.length === 1
                    ? '1fr'
                    : `repeat(${Math.min(post.image_urls.length, 3)}, minmax(0, 1fr))`,
                gap: 0.75,
                mb: 2,
              }}
            >
              {post.image_urls.slice(0, 3).map((imageUrl, index) => (
                <Box
                  key={imageUrl}
                  component="img"
                  src={imageUrl}
                  alt={`${title}配图 ${index + 1}`}
                  loading="lazy"
                  sx={{
                    display: 'block',
                    width: '100%',
                    aspectRatio:
                      post.image_urls.length === 1 ? '4 / 3' : '1 / 1',
                    maxHeight: post.image_urls.length === 1 ? 210 : 120,
                    objectFit: 'cover',
                    borderRadius: 1.5,
                  }}
                />
              ))}
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', mb: 2 }}>
            {post.topics.map((topic) => (
              <Typography
                key={topic.id}
                component="span"
                variant="body2"
                sx={{
                  color: '#496a61',
                  fontWeight: 600,
                }}
              >
                {topic.name.startsWith('#') ? topic.name : `#${topic.name}`}
              </Typography>
            ))}
          </Box>

          <Stack
            direction="row"
            alignItems="flex-end"
            justifyContent="space-between"
            spacing={1}
            sx={{ mt: 'auto', minWidth: 0 }}
          >
            <Stack spacing={0.1} sx={{ minWidth: 0 }}>
              <Typography
                variant="caption"
                color="text.primary"
                fontWeight={650}
                noWrap
              >
                {post.author.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {formatLocalDateTime(post.created_at)}
              </Typography>
            </Stack>
            {post.visibility === 'group' && (
              <Chip
                icon={<GroupsOutlinedIcon />}
                label={post.group?.name || '讨论组'}
                size="small"
                sx={{
                  flexShrink: 0,
                  maxWidth: '48%',
                  height: 26,
                  color: '#496a61',
                  bgcolor: '#edf4f1',
                  border: '1px solid #d4e4de',
                  fontWeight: 650,
                  '& .MuiChip-icon': {
                    color: '#62877d',
                    fontSize: 16,
                  },
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                }}
              />
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default WritingCard;
