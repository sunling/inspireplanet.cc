import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { Box, Button } from '@mui/material';

interface TextCollapseProps {
  html?: string; // 支持富文本
  text?: string; // 支持纯文本
  children?: ReactNode; // 支持自定义内容
  maxLines?: number; // 文本模式下的最大行数
  maxItems?: number; // 列表模式下的最大显示项数
  sx?: any;
}

const TextCollapse: React.FC<TextCollapseProps> = ({
  html,
  text,
  children,
  maxLines = 8,
  maxItems,
  sx = {},
}) => {
  const [open, setOpen] = useState(false);
  const [isOverflow, setIsOverflow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && !maxItems) {
      const lineHeight = parseFloat(
        window.getComputedStyle(ref.current).lineHeight || '24'
      );
      const maxHeight = lineHeight * maxLines;
      setIsOverflow(ref.current.scrollHeight > maxHeight);
    }
  }, [html, text, children, maxLines, maxItems]);

  // 列表模式下基于 maxItems 判断是否需要折叠
  const isListMode = maxItems !== undefined;

  useEffect(() => {
    if (isListMode && children) {
      const childArray = Array.isArray(children) ? children : [children];
      setIsOverflow(childArray.length > maxItems!);
    }
  }, [children, maxItems, isListMode]);

  const toggleOpen = (e: React.MouseEvent) => {
    setOpen((v) => !v);
    e.stopPropagation();
  };

  const childArray =
    isListMode && children
      ? Array.isArray(children)
        ? children
        : [children]
      : [];

  return (
    <Box>
      {/* 渲染展开状态的内容 - 列表模式用ol包裹 */}
      {open && children && isListMode && (
        <Box
          component="ol"
          ref={ref}
          sx={{
            m: 0,
            pl: 2.5,
            ...sx,
          }}
        >
          {childArray}
        </Box>
      )}

      {/* 渲染展开状态的内容 - 非列表模式用普通Box */}
      {open && children && !isListMode && (
        <Box
          ref={ref}
          sx={{
            mb: 2,
            ...sx,
          }}
        >
          {children}
        </Box>
      )}

      {/* 渲染折叠状态的内容 */}
      {!open && children && maxItems && (
        <Box
          component="ol"
          ref={ref}
          sx={{
            m: 0,
            pl: 2.5,
            ...sx,
          }}
        >
          {childArray.slice(0, maxItems)}
        </Box>
      )}

      {/* 文本模式渲染 */}
      {!children && (
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
      )}

      {isOverflow && (
        <Button variant="text" size="small" onClick={toggleOpen} sx={{ mb: 1 }}>
          {open ? '收起详情' : '展开详情'}
        </Button>
      )}
    </Box>
  );
};

export default TextCollapse;
