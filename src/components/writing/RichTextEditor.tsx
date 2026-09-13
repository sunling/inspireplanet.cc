import React, { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import DOMPurify from 'dompurify';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import CodeIcon from '@mui/icons-material/Code';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import { WritingRichContent } from '../../netlify/types';
import {
  createRichTextExtensions,
  looksLikeMarkdown,
  markdownToHtml,
} from '../rich-text/config';
import styles from '../rich-text/richText.module.css';

interface Props {
  content: WritingRichContent;
  maxLength?: number;
  onChange: (content: WritingRichContent, plainText: string) => void;
}

const TEXT_COLORS = ['#292522', '#e45d34', '#b23a48', '#496a61', '#376996'];
const HIGHLIGHT_COLORS = [
  '#fff1a8',
  '#ffd8c8',
  '#dcefe7',
  '#dce9f7',
  '#eadff4',
];

const RichTextEditor: React.FC<Props> = ({
  content,
  maxLength = 20000,
  onChange,
}) => {
  const [, setRevision] = useState(0);
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
  const [highlightAnchor, setHighlightAnchor] = useState<HTMLElement | null>(
    null
  );
  const editor = useEditor({
    extensions: createRichTextExtensions(),
    content,
    editorProps: {
      attributes: {
        class: styles.editor,
        'aria-label': '富文本正文',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(
        currentEditor.getJSON() as WritingRichContent,
        currentEditor.getText({ blockSeparator: '\n' })
      );
    },
    onTransaction: () => setRevision((value) => value + 1),
  });

  useEffect(() => () => editor?.destroy(), [editor]);

  if (!editor) return null;

  const askForLink = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    const input = window.prompt('请输入链接地址', previousUrl);
    if (input === null) return;
    const url = input.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const markdown = event.clipboardData.getData('text/plain');
    if (!looksLikeMarkdown(markdown)) return;

    event.preventDefault();
    editor
      .chain()
      .focus()
      .insertContent(DOMPurify.sanitize(markdownToHtml(markdown)))
      .run();
  };

  const tools = [
    {
      title: '粗体',
      icon: <FormatBoldIcon />,
      active: editor.isActive('bold'),
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      title: '斜体',
      icon: <FormatItalicIcon />,
      active: editor.isActive('italic'),
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      title: '删除线',
      icon: <StrikethroughSIcon />,
      active: editor.isActive('strike'),
      action: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      title: '行内代码',
      icon: <CodeIcon />,
      active: editor.isActive('code'),
      action: () => editor.chain().focus().toggleCode().run(),
    },
    {
      title: '无序列表',
      icon: <FormatListBulletedIcon />,
      active: editor.isActive('bulletList'),
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      title: '有序列表',
      icon: <FormatListNumberedIcon />,
      active: editor.isActive('orderedList'),
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      title: '引用',
      icon: <FormatQuoteIcon />,
      active: editor.isActive('blockquote'),
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
  ];
  const textLength = editor.getText().length;

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: 'hidden',
        borderColor: textLength > maxLength ? 'error.main' : 'divider',
      }}
    >
      <Stack
        direction="row"
        flexWrap="wrap"
        alignItems="center"
        gap={0.25}
        sx={{ p: 0.75, bgcolor: '#faf9f7' }}
      >
        <Tooltip title="一级标题">
          <IconButton
            size="small"
            color={
              editor.isActive('heading', { level: 1 }) ? 'primary' : 'default'
            }
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <Typography fontWeight={800}>H1</Typography>
          </IconButton>
        </Tooltip>
        <Tooltip title="二级标题">
          <IconButton
            size="small"
            color={
              editor.isActive('heading', { level: 2 }) ? 'primary' : 'default'
            }
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Typography fontWeight={800}>H2</Typography>
          </IconButton>
        </Tooltip>
        <Tooltip title="三级标题">
          <IconButton
            size="small"
            color={
              editor.isActive('heading', { level: 3 }) ? 'primary' : 'default'
            }
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            <Typography fontWeight={800}>H3</Typography>
          </IconButton>
        </Tooltip>
        <Tooltip title="四级标题">
          <IconButton
            size="small"
            color={
              editor.isActive('heading', { level: 4 }) ? 'primary' : 'default'
            }
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 4 }).run()
            }
          >
            <Typography fontWeight={800}>H4</Typography>
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        {tools.map((tool) => (
          <Tooltip title={tool.title} key={tool.title}>
            <IconButton
              size="small"
              color={tool.active ? 'primary' : 'default'}
              onClick={tool.action}
            >
              {tool.icon}
            </IconButton>
          </Tooltip>
        ))}
        <Tooltip title="代码块">
          <IconButton
            size="small"
            color={editor.isActive('codeBlock') ? 'primary' : 'default'}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Box component="span" sx={{ fontSize: 12, fontWeight: 800 }}>
              {'<>'}
            </Box>
          </IconButton>
        </Tooltip>
        <Tooltip title="分隔线">
          <IconButton
            size="small"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <HorizontalRuleIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="添加链接">
          <IconButton
            size="small"
            color={editor.isActive('link') ? 'primary' : 'default'}
            onClick={askForLink}
          >
            <LinkIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="移除链接">
          <span>
            <IconButton
              size="small"
              disabled={!editor.isActive('link')}
              onClick={() => editor.chain().focus().unsetLink().run()}
            >
              <LinkOffIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Tooltip title="文字颜色">
          <IconButton
            size="small"
            color={editor.isActive('textColor') ? 'primary' : 'default'}
            onClick={(event) => setColorAnchor(event.currentTarget)}
          >
            <FormatColorTextIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="背景高亮">
          <IconButton
            size="small"
            color={editor.isActive('textHighlight') ? 'primary' : 'default'}
            onClick={(event) => setHighlightAnchor(event.currentTarget)}
          >
            <BorderColorIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="撤销">
          <span>
            <IconButton
              size="small"
              disabled={!editor.can().chain().focus().undo().run()}
              onClick={() => editor.chain().focus().undo().run()}
            >
              <UndoIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="重做">
          <span>
            <IconButton
              size="small"
              disabled={!editor.can().chain().focus().redo().run()}
              onClick={() => editor.chain().focus().redo().run()}
            >
              <RedoIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      <Popover
        open={Boolean(colorAnchor)}
        anchorEl={colorAnchor}
        onClose={() => setColorAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Stack direction="row" spacing={0.5} sx={{ p: 1 }}>
          {TEXT_COLORS.map((color) => (
            <IconButton
              key={color}
              size="small"
              aria-label={`设置文字颜色 ${color}`}
              onClick={() => {
                editor.chain().focus().setMark('textColor', { color }).run();
                setColorAnchor(null);
              }}
            >
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  bgcolor: color,
                }}
              />
            </IconButton>
          ))}
          <Button
            size="small"
            color="inherit"
            onClick={() => {
              editor.chain().focus().unsetMark('textColor').run();
              setColorAnchor(null);
            }}
          >
            清除
          </Button>
        </Stack>
      </Popover>
      <Popover
        open={Boolean(highlightAnchor)}
        anchorEl={highlightAnchor}
        onClose={() => setHighlightAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Stack direction="row" spacing={0.5} sx={{ p: 1 }}>
          {HIGHLIGHT_COLORS.map((color) => (
            <IconButton
              key={color}
              size="small"
              aria-label={`设置背景高亮 ${color}`}
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .setMark('textHighlight', { color })
                  .run();
                setHighlightAnchor(null);
              }}
            >
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: 1,
                  bgcolor: color,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            </IconButton>
          ))}
          <Button
            size="small"
            color="inherit"
            onClick={() => {
              editor.chain().focus().unsetMark('textHighlight').run();
              setHighlightAnchor(null);
            }}
          >
            清除
          </Button>
        </Stack>
      </Popover>
      <Divider />
      <EditorContent editor={editor} onPaste={handlePaste} />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', px: 1.5, pt: 0.75 }}
      >
        支持直接粘贴
        Markdown：标题、粗体、列表、引用、分隔线、代码和链接会自动排版
      </Typography>
      <Typography
        variant="caption"
        color={textLength > maxLength ? 'error' : 'text.disabled'}
        sx={{ display: 'block', textAlign: 'right', px: 1.5, pb: 1 }}
      >
        {textLength}/{maxLength}
      </Typography>
    </Paper>
  );
};

export default RichTextEditor;
