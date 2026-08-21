import React, { useEffect } from 'react';
import { Box, Dialog, IconButton, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';

interface ImagePreviewDialogProps {
  images: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  alt: string;
}

const ImagePreviewDialog: React.FC<ImagePreviewDialogProps> = ({
  images,
  index,
  onIndexChange,
  onClose,
  alt,
}) => {
  const open = images.length > 0 && index >= 0 && index < images.length;
  const hasPrevious = index > 0;
  const hasNext = index < images.length - 1;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && hasPrevious) {
        event.preventDefault();
        onIndexChange(index - 1);
      } else if (event.key === 'ArrowRight' && hasNext) {
        event.preventDefault();
        onIndexChange(index + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasNext, hasPrevious, index, onIndexChange, open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            m: { xs: 1, sm: 3 },
            width: 'min(94vw, 1200px)',
            height: '88vh',
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'visible',
          },
        },
        backdrop: { sx: { bgcolor: 'rgba(0, 0, 0, 0.88)' } },
      }}
    >
      <IconButton
        aria-label="关闭图片预览"
        onClick={onClose}
        sx={{ position: 'absolute', right: 0, top: -48, color: '#fff' }}
      >
        <CloseIcon />
      </IconButton>
      {images.length > 1 && (
        <Typography
          aria-live="polite"
          sx={{
            position: 'absolute',
            left: '50%',
            top: -36,
            transform: 'translateX(-50%)',
            color: '#fff',
          }}
        >
          {index + 1} / {images.length}
        </Typography>
      )}
      {open && (
        <Box
          component="img"
          src={images[index]}
          alt={`${alt} ${index + 1}`}
          sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      )}
      {hasPrevious && (
        <IconButton
          aria-label="上一张图片"
          onClick={() => onIndexChange(index - 1)}
          sx={navigationButtonSx('left')}
        >
          <ChevronLeftIcon fontSize="large" />
        </IconButton>
      )}
      {hasNext && (
        <IconButton
          aria-label="下一张图片"
          onClick={() => onIndexChange(index + 1)}
          sx={navigationButtonSx('right')}
        >
          <ChevronRightIcon fontSize="large" />
        </IconButton>
      )}
    </Dialog>
  );
};

const navigationButtonSx = (side: 'left' | 'right') => ({
  position: 'absolute',
  [side]: { xs: 8, sm: 16 },
  top: '50%',
  transform: 'translateY(-50%)',
  transition: 'background-color 150ms ease',
  color: '#fff',
  bgcolor: 'rgba(0, 0, 0, 0.42)',
  '&:hover': {
    bgcolor: 'rgba(0, 0, 0, 0.62)',
    transform: 'translateY(-50%)',
  },
});

export default ImagePreviewDialog;
