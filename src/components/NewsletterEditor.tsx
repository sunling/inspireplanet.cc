import React, { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Node } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { NewsletterDocument } from '../utils/newsletterDocument';
import { safeNewsletterLink } from '../utils/newsletterDocument';
import { normalizeNewsletterImageUrl } from '../utils/newsletterImage';

const EmailImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null }, alt: { default: '' } };
  },
  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (element) =>
          normalizeNewsletterImageUrl(
            (element as HTMLElement).getAttribute('src')
          )
            ? {}
            : false,
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      {
        src: normalizeNewsletterImageUrl(HTMLAttributes.src) || '',
        alt: String(HTMLAttributes.alt || ''),
        style: 'max-width:100%;height:auto;display:block;margin:20px 0',
      },
    ];
  },
});

interface Props {
  initialContent: NewsletterDocument;
  resetToken: number;
  onChange: (document: NewsletterDocument) => void;
}

export default function NewsletterEditor({
  initialContent,
  resetToken,
  onChange,
}: Props) {
  const [, setRevision] = useState(0);
  const [dialog, setDialog] = useState<'image' | 'link' | null>(null);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: false, defaultProtocol: 'https' },
      }),
      EmailImage,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        'aria-label': '邮件正文编辑器',
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
    onUpdate: ({ editor: current }) =>
      onChange(current.getJSON() as NewsletterDocument),
    onTransaction: () => setRevision((value) => value + 1),
  });
  useEffect(() => {
    if (resetToken && editor) editor.commands.setContent(initialContent);
  }, [resetToken, editor]);
  useEffect(() => () => editor?.destroy(), [editor]);
  if (!editor) return null;

  const openImage = () => {
    const attrs = editor.isActive('image') ? editor.getAttributes('image') : {};
    setUrl(attrs.src || '');
    setLabel(attrs.alt || '');
    setError(null);
    setDialog('image');
  };
  const openLink = () => {
    editor.chain().focus().extendMarkRange('link').run();
    const { from, to } = editor.state.selection;
    setUrl(editor.getAttributes('link').href || '');
    setLabel(editor.state.doc.textBetween(from, to, ' '));
    setError(null);
    setDialog('link');
  };
  const apply = () => {
    if (dialog === 'image') {
      const src = normalizeNewsletterImageUrl(url);
      if (!src) {
        setError('请粘贴公开 GitHub 图片页面地址或 raw 图片直链');
        return;
      }
      if (editor.isActive('image'))
        editor
          .chain()
          .focus()
          .updateAttributes('image', { src, alt: label })
          .run();
      else
        editor
          .chain()
          .focus()
          .insertContent({ type: 'image', attrs: { src, alt: label } })
          .run();
    } else {
      const href = safeNewsletterLink(url);
      if (!href || !label.trim()) {
        setError('请填写链接文字，以及完整的 HTTP 或 HTTPS 地址');
        return;
      }
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: label,
          marks: [{ type: 'link', attrs: { href } }],
        })
        .run();
    }
    setDialog(null);
  };
  const move = (direction: -1 | 1) => {
    const index = Math.min(
      editor.state.selection.$from.index(0),
      editor.state.doc.childCount - 1
    );
    const target = index + direction;
    const doc = editor.getJSON() as NewsletterDocument;
    if (target < 0 || target >= doc.content.length) return;
    const content = [...doc.content];
    [content[index], content[target]] = [content[target], content[index]];
    editor.commands.setContent({ ...doc, content });
    let position = 0;
    editor.state.doc.forEach((_, offset, i) => {
      if (i === target) position = offset;
    });
    editor.chain().focus().setNodeSelection(position).run();
  };
  const tools = [
    { label: '粗体', action: () => editor.chain().focus().toggleBold().run() },
    {
      label: '斜体',
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: '小标题',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: '引用',
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: '列表',
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    { label: '编辑链接／播客', action: openLink },
    {
      label: '移除链接',
      action: () => editor.chain().focus().unsetLink().run(),
    },
    { label: '插入／修改图片', action: openImage },
    { label: '上移当前段／图片', action: () => move(-1) },
    { label: '下移当前段／图片', action: () => move(1) },
    {
      label: '删除选中图片',
      action: () => {
        if (editor.isActive('image'))
          editor.chain().focus().deleteSelection().run();
      },
    },
    { label: '撤销', action: () => editor.chain().focus().undo().run() },
    { label: '重做', action: () => editor.chain().focus().redo().run() },
  ];
  return (
    <>
      <Box
        sx={{
          border: '1px solid #d9c7b8',
          borderRadius: 2,
          overflow: 'hidden',
          backgroundColor: '#fffdf9',
        }}
      >
        <Stack
          direction="row"
          flexWrap="wrap"
          gap={0.5}
          sx={{
            p: 1,
            backgroundColor: '#f6f2ed',
            borderBottom: '1px solid #eadfd4',
          }}
        >
          {tools.map((tool) => (
            <Button
              key={tool.label}
              size="small"
              onMouseDown={(event) => event.preventDefault()}
              onClick={tool.action}
            >
              {tool.label}
            </Button>
          ))}
        </Stack>
        <Typography
          variant="caption"
          sx={{ display: 'block', px: 2, pt: 1, color: 'text.secondary' }}
        >
          直接编辑下方正文。先点击插入位置，再插入图片；选中图片后可上移、下移或删除。
        </Typography>
        <Box
          sx={{
            maxHeight: { xs: 420, sm: 560 },
            overflowY: 'auto',
            '& .tiptap': {
              minHeight: 420,
              p: { xs: 2, sm: 3 },
              outline: 'none',
              lineHeight: 1.9,
              overflowWrap: 'anywhere',
            },
            '& .tiptap p': { margin: '0 0 18px' },
            '& .tiptap h1': { fontSize: 25, lineHeight: 1.6 },
            '& .tiptap h2': { fontSize: 20 },
            '& .tiptap blockquote': {
              m: '24px 0',
              p: 2.5,
              backgroundColor: '#fff5ec',
              borderLeft: '3px solid #d65b35',
            },
            '& .tiptap a': { color: '#b44a2d' },
            '& .tiptap .ProseMirror-selectednode': {
              outline: '2px solid #d65b35',
              outlineOffset: 3,
            },
          }}
        >
          <EditorContent editor={editor} />
        </Box>
      </Box>
      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {dialog === 'image'
            ? '在当前位置插入／修改图片'
            : '插入／修改链接或播客'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              label={dialog === 'image' ? 'GitHub 图片链接' : '链接地址'}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              inputProps={{ maxLength: 2048 }}
              helperText={
                dialog === 'image'
                  ? '公开 GitHub 图片页面地址或 raw 直链均可。'
                  : '小宇宙单集、会议详情页等完整链接均可。'
              }
            />
            <TextField
              label={dialog === 'image' ? '图片说明' : '链接文字'}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              inputProps={{ maxLength: 200 }}
            />
            {error && <Typography color="error">{error}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>取消</Button>
          <Button variant="contained" onClick={apply}>
            应用到正文
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
