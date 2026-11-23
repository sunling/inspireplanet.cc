import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Loading from '../../components/Loading';
import {
  CreateWritingRequest,
  WritingEditorMode,
  WritingGroup,
  WritingRichContent,
  WritingTemplate,
  WritingTemplatePrompt,
  WritingTopic,
  WritingVisibility,
} from '../../netlify/types';
import {
  writingsApi,
  writingTemplatesApi,
  writingTopicsApi,
  imagesApi,
  writingGroupsApi,
} from '../../netlify/config';
import { useGlobalSnackbar } from '../../context/app';
import { extractHashtags } from '../../utils/hashtags';
import TopicChip from '../../components/writing/TopicChip';
import RichTextEditor from '../../components/writing/RichTextEditor';
import { plainTextToRichContent } from '../../components/rich-text/config';

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_WRITING_IMAGES = 9;

type WritingSection =
  | { kind: 'paragraph'; text: string }
  | { kind: 'ending'; text: string }
  | { kind: 'template'; template: WritingTemplate; answers: string[] };

function sectionText(section: WritingSection) {
  if (section.kind !== 'template') return section.text;
  return [
    section.template.name,
    ...section.template.prompts.map(({ prompt }, index) =>
      [prompt, section.answers[index]].filter(Boolean).join('\n')
    ),
  ].join('\n\n');
}

interface PendingImageUpload {
  id: string;
  name: string;
  status: 'waiting' | 'uploading' | 'failed';
}

interface CharacterCountProps {
  current: number;
  max: number;
  compact?: boolean;
}

const CharacterCount: React.FC<CharacterCountProps> = ({
  current,
  max,
  compact,
}) => (
  <Typography
    variant="caption"
    color="text.disabled"
    sx={
      compact
        ? {
            position: 'absolute',
            right: 6,
            bottom: 4,
            fontSize: 10,
            lineHeight: 1,
            pointerEvents: 'none',
          }
        : {
            position: 'absolute',
            right: 12,
            bottom: 9,
            zIndex: 1,
            px: 0.5,
            borderRadius: 0.75,
            bgcolor: 'rgba(255, 255, 255, 0.88)',
            lineHeight: 1.5,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }
    }
  >
    {current}/{max}
  </Typography>
);

function OptionalSectionText({
  label,
  collapsible,
  hasContent,
  children,
}: {
  label: string;
  collapsible: boolean;
  hasContent: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  if (collapsible && !hasContent && !expanded) {
    return (
      <Box>
        <Button
          variant="text"
          size="small"
          sx={{
            bgcolor: 'transparent',
            boxShadow: 'none',
            '&:hover, &:active, &.Mui-focusVisible': {
              bgcolor: 'transparent',
              boxShadow: 'none',
            },
            '&.Mui-focusVisible': { outline: '2px solid currentColor' },
          }}
          onClick={() => setExpanded(true)}
        >
          ＋ 添加{label}
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

const WritingEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const showSnackbar = useGlobalSnackbar();
  const isEditing = Boolean(id);

  const [topics, setTopics] = useState<WritingTopic[]>([]);
  const [templates, setTemplates] = useState<WritingTemplate[]>([]);
  const [groups, setGroups] = useState<WritingGroup[]>([]);
  const [title, setTitle] = useState('');
  const [openingRevision, setOpeningRevision] = useState(0);
  const [multiParagraph, setMultiParagraph] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    resolve: (accepted: boolean) => void;
  } | null>(null);
  const [sections, setSections] = useState<WritingSection[]>([]);
  const [body, setBody] = useState('');
  const [editorMode, setEditorMode] = useState<WritingEditorMode>('basic');
  const [richBody, setRichBody] = useState<WritingRichContent | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [promptFields, setPromptFields] = useState<WritingTemplatePrompt[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [isReview, setIsReview] = useState(false);
  const [visibility, setVisibility] = useState<WritingVisibility>('public');
  const [groupId, setGroupId] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [pendingImageUploads, setPendingImageUploads] = useState<
    PendingImageUpload[]
  >([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [historicalTemplateName, setHistoricalTemplateName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [
          topicsResponse,
          templatesResponse,
          groupsResponse,
          postResponse,
        ] = await Promise.all([
          writingTopicsApi.getAll(),
          writingTemplatesApi.getAll(),
          writingGroupsApi.list(),
          id ? writingsApi.getById(id) : Promise.resolve(null),
        ]);

        if (!active) return;
        if (!topicsResponse.success || !templatesResponse.success) {
          setError('加载话题或模板失败');
          return;
        }

        setTopics(topicsResponse.data?.topics || []);
        setTemplates(templatesResponse.data?.templates || []);
        setGroups(
          (groupsResponse.data?.groups || []).filter(
            (group) => group.membership_status === 'approved'
          )
        );

        if (id) {
          if (!postResponse?.success || !postResponse.data?.post) {
            setError(postResponse?.error || '加载书写失败');
            return;
          }
          const post = postResponse.data.post;
          if (!post.can_edit) {
            setError('你没有权限编辑这篇书写');
            return;
          }
          setTitle(post.title || '');
          const stored = post.body_rich?.writingSections as
            | {
                opening: string;
                sections: WritingSection[];
                editorMode?: WritingEditorMode;
              }
            | undefined;
          const saved =
            typeof stored?.opening === 'string' &&
            Array.isArray(stored.sections) &&
            stored.sections.every((section) =>
              section?.kind === 'paragraph' || section?.kind === 'ending'
                ? typeof section.text === 'string'
                : section?.kind === 'template' &&
                  typeof section.template?.name === 'string' &&
                  Array.isArray(section.template.prompts) &&
                  section.template.prompts.every(
                    (prompt) => typeof prompt?.prompt === 'string'
                  ) &&
                  Array.isArray(section.answers) &&
                  section.answers.every((answer) => typeof answer === 'string')
            )
              ? stored
              : undefined;
          setMultiParagraph(Boolean(saved));
          setBody(saved?.opening ?? post.body ?? '');
          setSections(
            saved?.sections[saved.sections.length - 1]?.kind === 'template'
              ? [...saved.sections, { kind: 'ending', text: '' }]
              : (saved?.sections ?? [])
          );
          setEditorMode(
            saved?.editorMode === 'basic'
              ? 'basic'
              : post.editor_mode || 'basic'
          );
          setRichBody(
            saved
              ? {
                  type: 'doc',
                  content: (post.body_rich?.content || []).slice(
                    0,
                    Number(post.body_rich?.openingNodeCount)
                  ),
                }
              : post.body_rich || null
          );
          setTemplateId(post.template_id || '');
          setIsReview(post.writing_type === 'review');
          setVisibility(post.visibility);
          setGroupId(post.group_id || '');
          setIsAnonymous(
            post.writing_type === 'review' ? false : post.is_anonymous
          );
          setImageUrls(post.image_urls || []);

          const savedHashtags = extractHashtags(
            post.title || '',
            post.body,
            ...(post.template_snapshot?.items.map((item) => item.answer) || [])
          ).map((name) => name.toLocaleLowerCase());
          setTopicIds(
            post.topics
              .filter(
                (topic) =>
                  !savedHashtags.includes(topic.name.toLocaleLowerCase())
              )
              .map((topic) => topic.id)
          );

          if (post.template_snapshot) {
            setHistoricalTemplateName(post.template_snapshot.template_name);
            setPromptFields(
              post.template_snapshot.items.map((item) => ({
                key: item.key,
                prompt: item.prompt,
              }))
            );
            setAnswers(post.template_snapshot.items.map((item) => item.answer));
          }
        }
      } catch {
        if (active) setError('加载编辑器失败，请稍后重试');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id]);

  const sectionGroups: number[][] = [[]];
  sections.forEach((section, index) => {
    if (section.kind === 'paragraph') sectionGroups.push([]);
    sectionGroups[sectionGroups.length - 1].push(index);
  });

  const requestConfirmation = (
    description: string,
    title = '确认更改',
    confirmLabel = '继续'
  ) =>
    new Promise<boolean>((resolve) => {
      setConfirmation({ title, description, confirmLabel, resolve });
    });

  const closeConfirmation = (accepted: boolean) => {
    setConfirmation(null);
    confirmation?.resolve(accepted);
  };

  const confirmDeleteSection = async (groupIndex: number) => {
    if (sectionGroups.length <= 1) return;
    if (
      !(await requestConfirmation(
        '该段落的正文和模板回答将一并删除。',
        `删除段落 ${groupIndex + 1}？`,
        '删除'
      ))
    )
      return;
    const indices = sectionGroups[groupIndex];
    if (!indices) return;
    const remaining = sections.filter((_, index) => !indices.includes(index));
    if (groupIndex === 0) {
      const next = remaining.shift();
      const text = next?.kind === 'paragraph' ? next.text : '';
      setBody(text);
      setRichBody(editorMode === 'rich' ? plainTextToRichContent(text) : null);
      setOpeningRevision((revision) => revision + 1);
    }
    setSections(remaining);
  };

  const renderTemplatePicker = (
    index: number,
    selected?: Extract<WritingSection, { kind: 'template' }>
  ) => {
    if (!selected && !templates.length) return null;
    return (
      <TextField
        select
        size="small"
        fullWidth
        slotProps={{
          select: {
            displayEmpty: true,
            SelectDisplayProps: {
              'aria-label': '书写模版',
            },
            renderValue: () => selected?.template.name || '书写模版',
          },
        }}
        value={selected?.template.id || ''}
        onChange={async (event) => {
          const template = templates.find(
            ({ id }) => id === event.target.value
          );
          if (!template || selected?.template.id === template.id) return;
          if (
            selected?.answers.some((answer) => answer.trim()) &&
            !(await requestConfirmation('切换模板会清空当前模板回答，继续吗？'))
          )
            return;
          const next: WritingSection = {
            kind: 'template',
            template,
            answers: [],
          };
          setSections((current) => {
            const updated = [...current];
            if (selected) updated.splice(index, 1, next);
            else updated.splice(index, 0, next, { kind: 'ending', text: '' });
            return updated;
          });
        }}
        sx={{
          '& .MuiSelect-select': { textAlign: 'center' },
        }}
      >
        {selected &&
          !templates.some(({ id }) => id === selected.template.id) && (
            <MenuItem value={selected.template.id}>
              {selected.template.name}
            </MenuItem>
          )}
        {templates.map((template) => (
          <MenuItem key={template.id} value={template.id}>
            {template.name}
          </MenuItem>
        ))}
      </TextField>
    );
  };

  const fullBody = [body, ...sections.map(sectionText)]
    .filter(Boolean)
    .join('\n\n');

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId),
    [templateId, templates]
  );

  const detectedHashtags = useMemo(
    () => extractHashtags(title, fullBody, ...answers),
    [answers, fullBody, title]
  );

  const handleTemplateChange = async (nextTemplateId: string) => {
    if (nextTemplateId === templateId) return;
    const hasAnswers = answers.some((answer) => answer.trim());
    if (
      hasAnswers &&
      !(await requestConfirmation('切换模板会清空当前模板回答，继续吗？'))
    ) {
      return;
    }

    const nextTemplate = templates.find(
      (template) => template.id === nextTemplateId
    );
    setTemplateId(nextTemplateId);
    setPromptFields(nextTemplate?.prompts || []);
    setAnswers([]);
    setHistoricalTemplateName('');
  };

  const handleEditorModeChange = async (nextMode: WritingEditorMode | null) => {
    if (!nextMode || nextMode === editorMode) return;
    if (
      nextMode === 'basic' &&
      richBody &&
      !(await requestConfirmation(
        '切换到普通模式会移除富文本格式，但正文文字会保留。继续吗？'
      ))
    ) {
      return;
    }
    if (nextMode === 'rich') {
      setRichBody(richBody || plainTextToRichContent(body));
    }
    setEditorMode(nextMode);
  };

  const toggleTopic = (topicId: string) => {
    if (topicIds.includes(topicId)) {
      setTopicIds((current) =>
        current.filter((idValue) => idValue !== topicId)
      );
      return;
    }
    if (topicIds.length >= 5) {
      showSnackbar.warning('最多选择 5 个话题');
      return;
    }
    setTopicIds((current) => [...current, topicId]);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (
      imageUrls.length + pendingImageUploads.length + files.length >
      MAX_WRITING_IMAGES
    ) {
      showSnackbar.warning(`每篇书写最多上传 ${MAX_WRITING_IMAGES} 张图片`);
      return;
    }
    if (
      files.some(
        (file) =>
          !ALLOWED_IMAGE_TYPES.includes(file.type) ||
          file.size > 5 * 1024 * 1024
      )
    ) {
      showSnackbar.warning('仅支持 5MB 以内的 PNG、JPEG 或 WebP 图片');
      return;
    }

    setUploadingImages(true);
    const batchId = Date.now();
    const pendingUploads = files.map((file, index) => ({
      id: `${batchId}-${index}`,
      name: file.name,
      status: 'waiting' as const,
    }));
    setPendingImageUploads((current) => [...current, ...pendingUploads]);
    let successCount = 0;
    try {
      for (const [index, file] of files.entries()) {
        const pendingId = pendingUploads[index].id;
        setPendingImageUploads((current) =>
          current.map((item) =>
            item.id === pendingId ? { ...item, status: 'uploading' } : item
          )
        );
        try {
          const dataUrl = await readFileAsDataUrl(file);
          const response = await imagesApi.upload(dataUrl, 'writing');
          if (!response.success || !response.data?.url) {
            throw new Error(response.error || '图片上传失败');
          }
          setImageUrls((current) => [...current, response.data!.url]);
          setPendingImageUploads((current) =>
            current.filter((item) => item.id !== pendingId)
          );
          successCount += 1;
        } catch {
          setPendingImageUploads((current) =>
            current.map((item) =>
              item.id === pendingId ? { ...item, status: 'failed' } : item
            )
          );
        }
      }
      if (successCount === files.length) {
        showSnackbar.success(`${successCount} 张图片上传成功`);
      } else if (successCount > 0) {
        showSnackbar.warning(
          `${successCount} 张上传成功，${files.length - successCount} 张失败`
        );
      } else {
        showSnackbar.error('图片上传失败，请重试');
      }
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    const hasAnswer = answers.some((answer) => answer.trim());
    if (
      !body.trim() &&
      !hasAnswer &&
      !sections.some((section) =>
        section.kind !== 'template'
          ? section.text.trim()
          : section.answers.some((answer) => answer.trim())
      )
    ) {
      showSnackbar.warning('请填写正文或至少一个模板问题');
      return;
    }
    if (detectedHashtags.length > 5) {
      showSnackbar.warning('每篇书写最多添加 5 个自定义 #话题');
      return;
    }
    if (fullBody.length > 20000) {
      showSnackbar.warning('正文不能超过 20000 个字');
      return;
    }
    if (uploadingImages) {
      showSnackbar.warning('请等待图片上传完成');
      return;
    }
    if (visibility === 'group' && !groupId) {
      showSnackbar.warning('请选择讨论组');
      return;
    }
    const opening =
      editorMode === 'rich' && richBody
        ? richBody
        : plainTextToRichContent(body);
    const openingNodes = opening.content || [];
    const document: WritingRichContent = multiParagraph
      ? {
          type: 'doc',
          content: [
            ...openingNodes,
            ...(plainTextToRichContent(sections.map(sectionText).join('\n\n'))
              .content || []),
          ],
          openingNodeCount: openingNodes.length,
          writingSections: { opening: body, sections, editorMode },
        }
      : opening;
    const payload: CreateWritingRequest = {
      title,
      body: fullBody,
      editor_mode: editorMode,
      body_rich: editorMode === 'rich' || multiParagraph ? document : null,
      image_urls: imageUrls,
      template_id: templateId || null,
      template_answers: promptFields.map((prompt, index) => ({
        key: prompt.key,
        answer: answers[index] || '',
      })),
      topic_ids: topicIds,
      visibility,
      group_id: visibility === 'group' ? groupId : null,
      is_anonymous: isAnonymous,
    };

    // Lock synchronously: React state updates may not render before another submit.
    submittingRef.current = true;
    setSaving(true);
    let published = false;
    try {
      const response = id
        ? await writingsApi.update(id, payload)
        : await writingsApi.create(payload);
      if (!response.success || !response.data?.post) {
        showSnackbar.error(response.error || '保存失败');
        return;
      }
      published = true;
      showSnackbar.success(id ? '书写已更新' : '书写已发布');
      navigate(`/writing-circle/${response.data.post.id}`);
    } catch {
      showSnackbar.error('保存失败，请稍后重试');
    } finally {
      // Keep successful submissions locked until navigation unmounts the editor.
      if (!published) {
        submittingRef.current = false;
        setSaving(false);
      }
    }
  };

  if (loading) return <Loading message="正在准备书写空间..." />;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f7f5f2', py: { xs: 3, md: 6 } }}>
      <Container maxWidth="md">
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight={800}>
              {isEditing ? '继续整理这次思考' : '记录一次思考'}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              不急着得出结论，先诚实地写下此刻看见的东西。
            </Typography>
          </Box>
        </Stack>

        {error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : (
          <Paper
            component="form"
            onSubmit={handleSubmit}
            elevation={0}
            sx={{ p: { xs: 3, md: 5 }, borderRadius: 4 }}
          >
            <Stack spacing={4}>
              <Box sx={{ position: 'relative' }}>
                <TextField
                  label="标题（可选）"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  slotProps={{ htmlInput: { maxLength: 80 } }}
                  fullWidth
                />
                <CharacterCount current={title.length} max={80} />
              </Box>

              <Stack
                direction="row"
                justifyContent="space-between"
                gap={1}
                sx={{
                  '& .MuiToggleButton-root': {
                    whiteSpace: 'nowrap',
                    px: { xs: 0.5, sm: 1.25 },
                    fontSize: { xs: 11, sm: 13 },
                  },
                }}
              >
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  aria-label="写作模式"
                  sx={{
                    display: 'inline-grid',
                    gridAutoFlow: 'column',
                    gridAutoColumns: '1fr',
                    '& .MuiToggleButton-root': { justifyContent: 'center' },
                  }}
                  value={multiParagraph ? 'multiple' : 'single'}
                  onChange={async (_, value) => {
                    if (!value) return;
                    if (value === 'single' && sections.length) {
                      if (
                        !(await requestConfirmation(
                          '切换回单篇模式会删除模板和后续段落，继续吗？'
                        ))
                      )
                        return;
                      setSections([]);
                    }
                    if (value === 'multiple' && templateId) {
                      if (
                        !(await requestConfirmation(
                          '切换到多段落模式会清除原模板和回答，继续吗？'
                        ))
                      )
                        return;
                      setTemplateId('');
                      setPromptFields([]);
                      setAnswers([]);
                      setHistoricalTemplateName('');
                    }
                    setMultiParagraph(value === 'multiple');
                  }}
                >
                  <ToggleButton value="single">单篇</ToggleButton>
                  <ToggleButton value="multiple">多段落</ToggleButton>
                </ToggleButtonGroup>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={editorMode}
                  onChange={(_, value) => handleEditorModeChange(value)}
                  aria-label="正文编辑模式"
                >
                  <ToggleButton value="basic">普通模式</ToggleButton>
                  <ToggleButton value="rich">高级模式</ToggleButton>
                </ToggleButtonGroup>
              </Stack>

              {!multiParagraph && (
                <FormControl fullWidth>
                  <InputLabel id="writing-template-label">
                    书写模板（可选）
                  </InputLabel>
                  <Select
                    labelId="writing-template-label"
                    label="书写模板（可选）"
                    value={templateId}
                    onChange={(event) =>
                      handleTemplateChange(String(event.target.value))
                    }
                  >
                    <MenuItem value="">自由书写</MenuItem>
                    {templateId &&
                      !selectedTemplate &&
                      historicalTemplateName && (
                        <MenuItem value={templateId}>
                          {historicalTemplateName}
                        </MenuItem>
                      )}
                    {templates.map((template) => (
                      <MenuItem key={template.id} value={template.id}>
                        {template.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {(selectedTemplate?.description ||
                    historicalTemplateName) && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      {selectedTemplate?.description ||
                        '使用发布时保存的历史模板'}
                    </Typography>
                  )}
                </FormControl>
              )}

              {!multiParagraph && promptFields.length > 0 && (
                <Box>
                  <Stack spacing={2}>
                    {promptFields.map((prompt, index) => (
                      <Box
                        key={`${prompt.key}-${index}`}
                        sx={{ position: 'relative' }}
                      >
                        <TextField
                          label={prompt.prompt}
                          placeholder={prompt.placeholder}
                          value={answers[index] || ''}
                          onChange={(event) =>
                            setAnswers((current) => {
                              const next = [...current];
                              next[index] = event.target.value;
                              return next;
                            })
                          }
                          multiline
                          minRows={3}
                          slotProps={{ htmlInput: { maxLength: 4000 } }}
                          fullWidth
                        />
                        <CharacterCount
                          current={(answers[index] || '').length}
                          max={4000}
                        />
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              <Box>
                {multiParagraph ? (
                  <Stack spacing={2}>
                    {sectionGroups.map((indices, groupIndex) => (
                      <Paper key={groupIndex} variant="outlined" sx={{ p: 2 }}>
                        <Stack spacing={2}>
                          {groupIndex === 0 && (
                            <OptionalSectionText
                              label="开头"
                              collapsible={indices.some(
                                (index) => sections[index].kind === 'template'
                              )}
                              hasContent={Boolean(body.trim())}
                            >
                              {editorMode === 'rich' ? (
                                <RichTextEditor
                                  key={openingRevision}
                                  minHeight={96}
                                  content={
                                    richBody || plainTextToRichContent(body)
                                  }
                                  onChange={(content, plainText) => {
                                    setRichBody(content);
                                    setBody(plainText);
                                  }}
                                />
                              ) : (
                                <Box sx={{ position: 'relative' }}>
                                  <TextField
                                    label="段落 1 开始"
                                    placeholder="自由地写下观察；输入 #话题 可以创建自己的话题。"
                                    value={body}
                                    onChange={(event) =>
                                      setBody(event.target.value)
                                    }
                                    multiline
                                    size={body.trim() ? 'medium' : 'small'}
                                    minRows={2}
                                    sx={{
                                      '& .MuiOutlinedInput-root': { pb: 3 },
                                    }}
                                    slotProps={{
                                      htmlInput: { maxLength: 20000 },
                                    }}
                                    fullWidth
                                  />
                                  <CharacterCount
                                    compact
                                    current={body.length}
                                    max={20000}
                                  />
                                </Box>
                              )}
                            </OptionalSectionText>
                          )}
                          {indices.map((index) => {
                            const section = sections[index];
                            return (
                              <Box key={index}>
                                {section.kind !== 'template' ? (
                                  <OptionalSectionText
                                    label={
                                      section.kind === 'ending'
                                        ? '结尾'
                                        : '开头'
                                    }
                                    collapsible={
                                      section.kind === 'ending' ||
                                      indices.some(
                                        (position) =>
                                          sections[position].kind === 'template'
                                      )
                                    }
                                    hasContent={Boolean(section.text.trim())}
                                  >
                                    <TextField
                                      label={`段落 ${groupIndex + 1} ${section.kind === 'ending' ? '结尾' : '开始'}`}
                                      value={section.text}
                                      onChange={(event) =>
                                        setSections((current) =>
                                          current.map((item, position) =>
                                            position === index
                                              ? {
                                                  kind: section.kind,
                                                  text: event.target.value,
                                                }
                                              : item
                                          )
                                        )
                                      }
                                      multiline
                                      size={
                                        section.text.trim() ? 'medium' : 'small'
                                      }
                                      minRows={2}
                                      fullWidth
                                    />
                                  </OptionalSectionText>
                                ) : (
                                  <Box>
                                    <Stack spacing={2}>
                                      {section.template.description && (
                                        <Typography color="text.secondary">
                                          {section.template.description}
                                        </Typography>
                                      )}
                                      {section.template.prompts.map(
                                        (prompt, answerIndex) => (
                                          <Box
                                            key={prompt.key}
                                            sx={{ position: 'relative' }}
                                          >
                                            <TextField
                                              label={prompt.prompt}
                                              placeholder={prompt.placeholder}
                                              value={
                                                section.answers[answerIndex] ||
                                                ''
                                              }
                                              onChange={(event) =>
                                                setSections((current) =>
                                                  current.map(
                                                    (item, position) => {
                                                      if (
                                                        position !== index ||
                                                        item.kind !== 'template'
                                                      )
                                                        return item;
                                                      const next =
                                                        item.template.prompts.map(
                                                          (_, promptIndex) =>
                                                            item.answers[
                                                              promptIndex
                                                            ] || ''
                                                        );
                                                      next[answerIndex] =
                                                        event.target.value;
                                                      return {
                                                        ...item,
                                                        answers: next,
                                                      };
                                                    }
                                                  )
                                                )
                                              }
                                              multiline
                                              size={
                                                (
                                                  section.answers[
                                                    answerIndex
                                                  ] || ''
                                                ).trim()
                                                  ? 'medium'
                                                  : 'small'
                                              }
                                              minRows={
                                                (
                                                  section.answers[
                                                    answerIndex
                                                  ] || ''
                                                ).trim()
                                                  ? 3
                                                  : 2
                                              }
                                              sx={{
                                                '& .MuiOutlinedInput-root': {
                                                  pb: 3,
                                                },
                                              }}
                                              slotProps={{
                                                htmlInput: {
                                                  maxLength: 4000,
                                                },
                                              }}
                                              fullWidth
                                            />
                                            <CharacterCount
                                              compact
                                              current={
                                                (
                                                  section.answers[
                                                    answerIndex
                                                  ] || ''
                                                ).length
                                              }
                                              max={4000}
                                            />
                                          </Box>
                                        )
                                      )}{' '}
                                    </Stack>
                                  </Box>
                                )}
                              </Box>
                            );
                          })}
                          <Stack
                            direction="row"
                            spacing={1}
                            useFlexGap
                            sx={{
                              flexWrap: { xs: 'wrap', sm: 'nowrap' },
                              '& > *': { flex: '1 1 0', minWidth: 0 },
                              '& > :first-child': {
                                flexBasis: { xs: '100%', sm: 0 },
                              },
                            }}
                          >
                            <Box>
                              {(() => {
                                const index = indices.find(
                                  (position) =>
                                    sections[position].kind === 'template'
                                );
                                const selected =
                                  index === undefined
                                    ? undefined
                                    : sections[index];
                                return renderTemplatePicker(
                                  index ??
                                    (indices[indices.length - 1] ?? -1) + 1,
                                  selected?.kind === 'template'
                                    ? selected
                                    : undefined
                                );
                              })()}
                            </Box>
                            {groupIndex === sectionGroups.length - 1 && (
                              <Button
                                variant="outlined"
                                sx={{ whiteSpace: 'nowrap' }}
                                onClick={() =>
                                  setSections((current) => [
                                    ...current,
                                    { kind: 'paragraph', text: '' },
                                  ])
                                }
                              >
                                添加下一段
                              </Button>
                            )}
                            {sectionGroups.length > 1 && (
                              <Button
                                color="error"
                                variant="outlined"
                                size="small"
                                sx={{ whiteSpace: 'nowrap' }}
                                onClick={() =>
                                  void confirmDeleteSection(groupIndex)
                                }
                              >
                                删除段落
                              </Button>
                            )}
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                ) : editorMode === 'rich' ? (
                  <RichTextEditor
                    content={richBody || plainTextToRichContent(body)}
                    onChange={(content, plainText) => {
                      setRichBody(content);
                      setBody(plainText);
                    }}
                  />
                ) : (
                  <Box sx={{ position: 'relative' }}>
                    <TextField
                      label="正文"
                      placeholder="自由地写下观察；输入 #话题 可以创建自己的话题。"
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      multiline
                      minRows={8}
                      slotProps={{ htmlInput: { maxLength: 20000 } }}
                      fullWidth
                    />
                    <CharacterCount current={body.length} max={20000} />
                  </Box>
                )}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mx: 1.75, mt: 0.5 }}
                >
                  输入 #话题 会自动识别并标亮
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  图片（可选）
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1.5 }}
                >
                  最多 9 张，每张不超过 5MB，支持 PNG、JPEG 和 WebP。已添加{' '}
                  {imageUrls.length}/9 张。
                </Typography>
                {imageUrls.length + pendingImageUploads.length > 0 && (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: 'repeat(3, minmax(0, 1fr))',
                        sm: 'repeat(3, minmax(0, 1fr))',
                      },
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    {imageUrls.map((imageUrl, index) => (
                      <Box key={imageUrl} sx={{ position: 'relative' }}>
                        <Box
                          component="img"
                          src={imageUrl}
                          alt={`书写配图 ${index + 1}`}
                          sx={{
                            width: '100%',
                            aspectRatio: '1 / 1',
                            display: 'block',
                            objectFit: 'cover',
                            borderRadius: 2,
                          }}
                        />
                        <Button
                          type="button"
                          color="error"
                          size="small"
                          variant="contained"
                          startIcon={<DeleteOutlineIcon />}
                          onClick={() =>
                            setImageUrls((current) =>
                              current.filter((url) => url !== imageUrl)
                            )
                          }
                          sx={{ position: 'absolute', right: 8, top: 8 }}
                        >
                          移除
                        </Button>
                      </Box>
                    ))}
                    {pendingImageUploads.map((upload) => (
                      <Box
                        key={upload.id}
                        sx={{
                          position: 'relative',
                          aspectRatio: '1 / 1',
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: '#ebe8e4',
                          color: 'text.secondary',
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <Stack spacing={1} alignItems="center" sx={{ px: 1 }}>
                          {upload.status === 'uploading' ? (
                            <CircularProgress size={24} />
                          ) : (
                            <AddPhotoAlternateIcon color="disabled" />
                          )}
                          <Typography
                            variant="caption"
                            color={
                              upload.status === 'failed'
                                ? 'error.main'
                                : 'text.secondary'
                            }
                            textAlign="center"
                          >
                            {upload.status === 'uploading'
                              ? '上传中'
                              : upload.status === 'failed'
                                ? '上传失败'
                                : '等待上传'}
                          </Typography>
                          {upload.status === 'failed' && (
                            <Button
                              type="button"
                              color="error"
                              size="small"
                              onClick={() =>
                                setPendingImageUploads((current) =>
                                  current.filter(
                                    (item) => item.id !== upload.id
                                  )
                                )
                              }
                            >
                              移除
                            </Button>
                          )}
                        </Stack>
                      </Box>
                    ))}
                  </Box>
                )}
                {imageUrls.length + pendingImageUploads.length <
                  MAX_WRITING_IMAGES && (
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<AddPhotoAlternateIcon />}
                    disabled={uploadingImages}
                  >
                    {uploadingImages ? '正在上传...' : '添加图片'}
                    <input
                      hidden
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={handleImageUpload}
                    />
                  </Button>
                )}
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  话题（可选）
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1.5 }}
                >
                  选择已有话题，或直接在标题、正文中输入 #话题。最多 5 个。
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {topics
                    .filter((topic) => !topic.is_user_created)
                    .map((topic) => {
                      const selected = topicIds.includes(topic.id);
                      return (
                        <TopicChip
                          key={topic.id}
                          topic={topic}
                          selected={selected}
                          onClick={() => toggleTopic(topic.id)}
                        />
                      );
                    })}
                </Box>
                {detectedHashtags.length > 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1.5 }}
                  >
                    已从内容识别：
                    {detectedHashtags.join(' ')}
                  </Typography>
                )}
                {detectedHashtags.length > 5 && (
                  <Alert severity="warning" sx={{ mt: 1.5 }}>
                    已识别 {detectedHashtags.length} 个话题，请保留最多 5 个。
                  </Alert>
                )}
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  谁可以看见
                </Typography>
                {isReview && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    回看默认公开分享；设为私密后，原书写下的作者回看评论会隐藏，重新公开后恢复。
                  </Alert>
                )}
                <RadioGroup
                  value={visibility}
                  onChange={(event) =>
                    setVisibility(event.target.value as WritingVisibility)
                  }
                >
                  <FormControlLabel
                    value="private"
                    control={<Radio />}
                    label="仅自己可见"
                  />
                  <FormControlLabel
                    value="public"
                    control={<Radio />}
                    label="公开到书写圈子（默认）"
                  />
                  {groups.length > 0 && (
                    <FormControlLabel
                      value="group"
                      disabled={isReview}
                      control={<Radio />}
                      label="仅指定讨论组成员可见"
                    />
                  )}
                </RadioGroup>
                {visibility === 'group' && (
                  <FormControl fullWidth sx={{ mt: 1.5 }}>
                    <InputLabel id="writing-group-label">选择讨论组</InputLabel>
                    <Select
                      labelId="writing-group-label"
                      label="选择讨论组"
                      value={groupId}
                      onChange={(event) =>
                        setGroupId(String(event.target.value))
                      }
                    >
                      {groups
                        .filter(
                          (group) => group.membership_status === 'approved'
                        )
                        .map((group) => (
                          <MenuItem key={group.id} value={group.id}>
                            {group.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                )}
                <FormControlLabel
                  control={
                    <Switch
                      checked={isAnonymous}
                      disabled={isReview}
                      onChange={(event) => setIsAnonymous(event.target.checked)}
                    />
                  }
                  label="匿名发布"
                  sx={{ mt: 1 }}
                />
              </Box>

              <Stack
                direction={{ xs: 'column-reverse', sm: 'row' }}
                spacing={2}
              >
                <Button
                  variant="outlined"
                  onClick={() => navigate(-1)}
                  disabled={saving}
                  fullWidth
                >
                  返回
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving || uploadingImages}
                  fullWidth
                >
                  {saving ? '正在保存...' : isEditing ? '保存修改' : '发布书写'}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        )}
        <Dialog
          open={confirmation !== null}
          onClose={() => closeConfirmation(false)}
          aria-labelledby="writing-confirmation-title"
          aria-describedby="writing-confirmation-description"
        >
          <DialogTitle id="writing-confirmation-title">
            {confirmation?.title}
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="writing-confirmation-description">
              {confirmation?.description}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button autoFocus onClick={() => closeConfirmation(false)}>
              取消
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => closeConfirmation(true)}
            >
              {confirmation?.confirmLabel}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default WritingEditor;
