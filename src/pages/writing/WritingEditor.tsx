import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
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
  Typography,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Loading from '../../components/Loading';
import {
  CreateWritingRequest,
  WritingGroup,
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

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_WRITING_IMAGES = 9;

interface PendingImageUpload {
  id: string;
  name: string;
  status: 'waiting' | 'uploading' | 'failed';
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
  const [body, setBody] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [promptFields, setPromptFields] = useState<WritingTemplatePrompt[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [topicIds, setTopicIds] = useState<string[]>([]);
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
          setBody(post.body || '');
          setTemplateId(post.template_id || '');
          setVisibility(post.visibility);
          setGroupId(post.group_id || '');
          setIsAnonymous(post.is_anonymous);
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
            setAnswers(
              Object.fromEntries(
                post.template_snapshot.items.map((item) => [
                  item.key,
                  item.answer,
                ])
              )
            );
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

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId),
    [templateId, templates]
  );

  const detectedHashtags = useMemo(
    () => extractHashtags(title, body, ...Object.values(answers)),
    [answers, body, title]
  );

  const handleTemplateChange = (nextTemplateId: string) => {
    if (nextTemplateId === templateId) return;
    const hasAnswers = Object.values(answers).some((answer) => answer.trim());
    if (hasAnswers && !window.confirm('切换模板会清空当前模板回答，继续吗？')) {
      return;
    }

    const nextTemplate = templates.find(
      (template) => template.id === nextTemplateId
    );
    setTemplateId(nextTemplateId);
    setPromptFields(nextTemplate?.prompts || []);
    setAnswers({});
    setHistoricalTemplateName('');
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
    const hasAnswer = Object.values(answers).some((answer) => answer.trim());
    if (!body.trim() && !hasAnswer) {
      showSnackbar.warning('请填写正文或至少一个模板问题');
      return;
    }
    if (detectedHashtags.length > 5) {
      showSnackbar.warning('每篇书写最多添加 5 个自定义 #话题');
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
    const payload: CreateWritingRequest = {
      title,
      body,
      image_urls: imageUrls,
      template_id: templateId || null,
      template_answers: promptFields.map((prompt) => ({
        key: prompt.key,
        answer: answers[prompt.key] || '',
      })),
      topic_ids: topicIds,
      visibility,
      group_id: visibility === 'group' ? groupId : null,
      is_anonymous: isAnonymous,
    };

    setSaving(true);
    try {
      const response = id
        ? await writingsApi.update(id, payload)
        : await writingsApi.create(payload);
      if (!response.success || !response.data?.post) {
        showSnackbar.error(response.error || '保存失败');
        return;
      }
      showSnackbar.success(id ? '书写已更新' : '书写已发布');
      navigate(`/writing-circle/${response.data.post.id}`);
    } catch {
      showSnackbar.error('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading message="正在准备书写空间..." />;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f7f5f2', py: { xs: 3, md: 6 } }}>
      <Container maxWidth="md">
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" fontWeight={800}>
              {isEditing ? '继续整理这次观察' : '记录一次自我观察'}
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
              <TextField
                label="标题（可选）"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                inputProps={{ maxLength: 80 }}
                helperText={`${title.length}/80`}
                fullWidth
              />

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
                {(selectedTemplate?.description || historicalTemplateName) && (
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

              {promptFields.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    模板引导
                  </Typography>
                  <Stack spacing={2}>
                    {promptFields.map((prompt) => (
                      <TextField
                        key={prompt.key}
                        label={prompt.prompt}
                        placeholder={prompt.placeholder}
                        value={answers[prompt.key] || ''}
                        onChange={(event) =>
                          setAnswers((current) => ({
                            ...current,
                            [prompt.key]: event.target.value,
                          }))
                        }
                        multiline
                        minRows={3}
                        inputProps={{ maxLength: 4000 }}
                        fullWidth
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              <TextField
                label="正文"
                placeholder="自由地写下观察；输入 #话题 可以创建自己的话题。"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                multiline
                minRows={8}
                inputProps={{ maxLength: 20000 }}
                helperText={`${body.length}/20000 · 输入 #话题 会自动识别并标亮`}
                fullWidth
              />

              <Box>
                <Typography variant="h6" gutterBottom>
                  自定义话题
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1.5 }}
                >
                  在标题、正文或模板回答中输入 #话题，发布时会自动创建。最多 5
                  个。
                </Typography>
                {detectedHashtags.length ? (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {detectedHashtags.map((hashtag) => (
                      <Chip
                        key={hashtag}
                        label={hashtag}
                        variant="outlined"
                        sx={{
                          borderColor: '#d9c8df',
                          bgcolor: '#faf6fc',
                          color: '#735b7c',
                          fontWeight: 500,
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.disabled">
                    暂未识别到自定义话题
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
                  选择话题（可选）
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1.5 }}
                >
                  话题用于辅助整理和筛选，最多选择 5 个
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
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  谁可以看见
                </Typography>
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
                      onChange={(event) => setIsAnonymous(event.target.checked)}
                    />
                  }
                  label="匿名发布（公开后不展示你的姓名和账号）"
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
      </Container>
    </Box>
  );
};

export default WritingEditor;
