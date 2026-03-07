import React, { useState, useRef, useEffect } from 'react';
import { Box, Button } from '@mui/material';

interface TextCollapseProps {
  html?: string; // 支持富文本
  text?: string; // 支持纯文本
  maxLines?: number;
  sx?: any;
}

const TextCollapse: React.FC<TextCollapseProps> = ({
  html,
  text,
  maxLines = 8,
  sx = {},
}) => {
  const [open, setOpen] = useState(false);
  const [isOverflow, setIsOverflow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const lineHeight = parseFloat(
        window.getComputedStyle(ref.current).lineHeight || '24',
      );
      const maxHeight = lineHeight * maxLines;
      setIsOverflow(ref.current.scrollHeight > maxHeight);
    }
  }, [html, text, maxLines]);

  return (
    <Box>
      <Box
        ref={ref}
        sx={{
          mb: 2,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: open ? 'unset' : maxLines,
          WebkitBoxOrient: 'vertical',
          textOverflow: 'ellipsis',
          whiteSpace: open ? 'normal' : 'pre-line',
          maxHeight: open ? 'none' : `${maxLines * 1.4}em`,
          transition: 'max-height 0.3s',
          ...sx,
        }}
        {...(html
          ? { dangerouslySetInnerHTML: { __html: html } }
          : { children: text })}
      />
      {isOverflow && (
        <Button
          variant="text"
          size="small"
          onClick={(e) => {
            setOpen((v) => !v);
            e.stopPropagation();
          }}
          sx={{ mb: 1 }}
        >
          {open ? '收起详情' : '展开详情'}
        </Button>
      )}
    </Box>
  );
};

export default TextCollapse;
