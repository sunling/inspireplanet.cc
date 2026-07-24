import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  WritingAdminStats,
  WritingGroup,
  WritingGroupMember,
  WritingTemplate,
  WritingTopic,
} from '../../netlify/types';
import { writingAdminApi } from '../../netlify/config';
import { WritingPartnerPairAdmin } from '../../netlify/services/writingAdmin';
import Loading from '../../components/Loading';
import { useGlobalSnackbar } from '../../context/app';

type Editor =
  | { kind: 'topic'; value: Partial<WritingTopic> }
  | { kind: 'template'; value: Partial<WritingTemplate> }
  | { kind: 'group'; value: Partial<WritingGroup> }
  | null;

const WritingAdmin: React.FC = () => {
  const snackbar = useGlobalSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WritingAdminStats | null>(null);
  const [topics, setTopics] = useState<WritingTopic[]>([]);
  const [templates, setTemplates] = useState<WritingTemplate[]>([]);
  const [groups, setGroups] = useState<WritingGroup[]>([]);
  const [members, setMembers] = useState<WritingGroupMember[]>([]);
  const [pairs, setPairs] = useState<WritingPartnerPairAdmin[]>([]);
  const [pairGroupId, setPairGroupId] = useState('');
  const [pairUserAId, setPairUserAId] = useState('');
  const [pairUserBId, setPairUserBId] = useState('');
  const [editor, setEditor] = useState<Editor>(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    writingAdminApi
      .dashboard()
      .then((response) => {
        if (!response.success || !response.data)
          throw new Error(response.error);
        setStats(response.data.stats);
        setTopics(response.data.topics);
        setTemplates(response.data.templates);
        setGroups(response.data.groups || []);
        setMembers(response.data.members || []);
        setPairs(response.data.pairs || []);
      })
      .catch(() => snackbar.error('加载后台数据失败'))
      .finally(() => setLoading(false));
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editor) return;
    setSaving(true);
    const response =
      editor.kind === 'topic'
        ? await writingAdminApi.saveTopic(editor.value)
        : editor.kind === 'template'
          ? await writingAdminApi.saveTemplate(editor.value)
          : await writingAdminApi.saveGroup(editor.value);
    setSaving(false);
    if (!response.success) return snackbar.error(response.error || '保存失败');
    snackbar.success('保存成功');
    setEditor(null);
    setLoading(true);
    load();
  };

  if (loading) return <Loading message="正在加载书写后台..." />;
  const approvedMembers = members.filter(
    (member) =>
      member.status === 'approved' &&
      (!pairGroupId || member.group_id === pairGroupId)
  );
  const memberName = (userId: string) =>
    members.find((member) => member.user_id === userId)?.user.name || userId;
  const groupName = (groupId: string) =>
    groups.find((group) => group.id === groupId)?.name || groupId;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f7f5f2', py: 5 }}>
      <Container maxWidth="lg">
        <Typography variant="h3" fontWeight={800} gutterBottom>
          书写圈子后台
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          管理话题和模板，并了解书写与互动情况。
        </Typography>
        {stats && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                md: 'repeat(5, 1fr)',
              },
              gap: 2,
              mb: 3,
            }}
          >
            {[
              ['书写总数', stats.total_posts],
              ['公开书写', stats.public_posts],
              ['书写用户', stats.active_writers],
              ['共鸣次数', stats.total_resonances],
              ['感受回应', stats.total_comments],
            ].map(([label, value]) => (
              <Paper key={String(label)} sx={{ p: 2 }} elevation={0}>
                <Typography color="text.secondary">{label}</Typography>
                <Typography variant="h4" fontWeight={800}>
                  {value}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}
        <Paper elevation={0} sx={{ p: 3 }}>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            sx={{ mb: 3 }}
          >
            <Tab label="热门话题" />
            <Tab label="话题标签" />
            <Tab label="书写模板" />
            <Tab label="讨论组" />
            <Tab label="入组申请" />
            <Tab label="书写搭子" />
          </Tabs>
          {tab === 0 && (
            <Stack spacing={1}>
              {stats?.popular_topics.length ? (
                stats.popular_topics.map((topic, index) => (
                  <Stack
                    key={topic.id}
                    direction="row"
                    justifyContent="space-between"
                    sx={{ p: 2, bgcolor: '#faf8f5', borderRadius: 2 }}
                  >
                    <Typography>
                      {index + 1}. {topic.name}
                    </Typography>
                    <Typography fontWeight={700}>
                      {topic.post_count} 篇
                    </Typography>
                  </Stack>
                ))
              ) : (
                <Alert severity="info">暂无话题数据</Alert>
              )}
            </Stack>
          )}
          {tab === 1 && (
            <>
              <Button
                variant="contained"
                onClick={() =>
                  setEditor({ kind: 'topic', value: { sort_order: 0 } })
                }
              >
                创建话题
              </Button>
              <Stack spacing={1} sx={{ mt: 2 }}>
                {topics.map((topic) => (
                  <Stack
                    key={topic.id}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ p: 2, bgcolor: '#faf8f5', borderRadius: 2 }}
                  >
                    <Box>
                      <Typography fontWeight={700}>{topic.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {topic.description || topic.slug}
                      </Typography>
                    </Box>
                    <Button
                      onClick={() => setEditor({ kind: 'topic', value: topic })}
                    >
                      编辑
                    </Button>
                  </Stack>
                ))}
              </Stack>
            </>
          )}
          {tab === 2 && (
            <>
              <Button
                variant="contained"
                onClick={() =>
                  setEditor({
                    kind: 'template',
                    value: { prompts: [], sort_order: 0 },
                  })
                }
              >
                创建模板
              </Button>
              <Stack spacing={1} sx={{ mt: 2 }}>
                {templates.map((template) => (
                  <Stack
                    key={template.id}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ p: 2, bgcolor: '#faf8f5', borderRadius: 2 }}
                  >
                    <Box>
                      <Typography fontWeight={700}>
                        {template.name} · v{template.version}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {template.description ||
                          `${template.prompts.length} 个问题`}
                      </Typography>
                    </Box>
                    <Button
                      onClick={() =>
                        setEditor({ kind: 'template', value: template })
                      }
                    >
                      编辑
                    </Button>
                  </Stack>
                ))}
              </Stack>
            </>
          )}
          {tab === 3 && (
            <>
              <Button
                variant="contained"
                onClick={() =>
                  setEditor({
                    kind: 'group',
                    value: { is_active: true },
                  })
                }
              >
                创建讨论组
              </Button>
              <Stack spacing={1} sx={{ mt: 2 }}>
                {groups.map((group) => (
                  <Stack
                    key={group.id}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ p: 2, bgcolor: '#faf8f5', borderRadius: 2 }}
                  >
                    <Box>
                      <Typography fontWeight={700}>{group.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {group.description || '暂无说明'}
                      </Typography>
                    </Box>
                    <Button
                      onClick={() => setEditor({ kind: 'group', value: group })}
                    >
                      编辑
                    </Button>
                  </Stack>
                ))}
              </Stack>
            </>
          )}
          {tab === 4 && (
            <Stack spacing={1}>
              {members.filter((member) => member.status === 'pending')
                .length ? (
                members
                  .filter((member) => member.status === 'pending')
                  .map((member) => (
                    <Stack
                      key={member.id}
                      direction={{ xs: 'column', sm: 'row' }}
                      justifyContent="space-between"
                      alignItems={{ xs: 'stretch', sm: 'center' }}
                      spacing={1}
                      sx={{ p: 2, bgcolor: '#faf8f5', borderRadius: 2 }}
                    >
                      <Box>
                        <Typography fontWeight={700}>
                          {member.user.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          申请加入 {groupName(member.group_id)}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          color="error"
                          onClick={async () => {
                            await writingAdminApi.reviewMembership(
                              member.id,
                              'rejected'
                            );
                            setLoading(true);
                            load();
                          }}
                        >
                          拒绝
                        </Button>
                        <Button
                          variant="contained"
                          onClick={async () => {
                            await writingAdminApi.reviewMembership(
                              member.id,
                              'approved'
                            );
                            setLoading(true);
                            load();
                          }}
                        >
                          通过
                        </Button>
                      </Stack>
                    </Stack>
                  ))
              ) : (
                <Alert severity="info">暂无待审核申请</Alert>
              )}
            </Stack>
          )}
          {tab === 5 && (
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="partner-group-label">讨论组</InputLabel>
                <Select
                  labelId="partner-group-label"
                  label="讨论组"
                  value={pairGroupId}
                  onChange={(event) => {
                    setPairGroupId(String(event.target.value));
                    setPairUserAId('');
                    setPairUserBId('');
                  }}
                >
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                {[pairUserAId, pairUserBId].map((value, index) => (
                  <FormControl fullWidth key={index}>
                    <InputLabel>{`成员 ${index + 1}`}</InputLabel>
                    <Select
                      label={`成员 ${index + 1}`}
                      value={value}
                      onChange={(event) =>
                        index === 0
                          ? setPairUserAId(String(event.target.value))
                          : setPairUserBId(String(event.target.value))
                      }
                    >
                      {approvedMembers.map((member) => (
                        <MenuItem key={member.user_id} value={member.user_id}>
                          {member.user.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ))}
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  variant="contained"
                  disabled={
                    !pairGroupId ||
                    !pairUserAId ||
                    !pairUserBId ||
                    pairUserAId === pairUserBId
                  }
                  onClick={async () => {
                    const response = await writingAdminApi.assignPartner(
                      pairGroupId,
                      pairUserAId,
                      pairUserBId
                    );
                    response.success
                      ? snackbar.success('搭子分配成功')
                      : snackbar.error(response.error || '分配失败');
                    setLoading(true);
                    load();
                  }}
                >
                  指定分配
                </Button>
                <Button
                  variant="outlined"
                  disabled={!pairGroupId}
                  onClick={async () => {
                    const response =
                      await writingAdminApi.randomAssignPartners(pairGroupId);
                    response.success
                      ? snackbar.success(
                          response.data?.message || '随机分配成功'
                        )
                      : snackbar.error(response.error || '随机分配失败');
                    setLoading(true);
                    load();
                  }}
                >
                  随机分配本组成员
                </Button>
              </Stack>
              <Stack spacing={1}>
                {pairs.map((pair) => (
                  <Paper key={pair.id} variant="outlined" sx={{ p: 1.5 }}>
                    {memberName(pair.user_a_id)} ↔ {memberName(pair.user_b_id)}
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      {groupName(pair.group_id)} ·{' '}
                      {pair.assignment_type === 'random' ? '随机' : '指定'}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          )}
        </Paper>
        <Dialog
          open={Boolean(editor)}
          onClose={() => setEditor(null)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            {editor?.value.id ? '编辑' : '创建'}
            {editor?.kind === 'topic'
              ? '话题'
              : editor?.kind === 'group'
                ? '讨论组'
                : '模板'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="名称"
                value={editor?.value.name || ''}
                onChange={(e) =>
                  editor &&
                  setEditor({
                    ...editor,
                    value: { ...editor.value, name: e.target.value },
                  } as Editor)
                }
              />
              <TextField
                label="说明"
                multiline
                value={editor?.value.description || ''}
                onChange={(e) =>
                  editor &&
                  setEditor({
                    ...editor,
                    value: { ...editor.value, description: e.target.value },
                  } as Editor)
                }
              />
              {editor && editor.kind !== 'group' && (
                <TextField
                  label="排序"
                  type="number"
                  value={editor.value.sort_order || 0}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      value: {
                        ...editor.value,
                        sort_order: Number(e.target.value),
                      },
                    } as Editor)
                  }
                />
              )}
              {editor?.kind === 'template' && (
                <TextField
                  label="模板问题（每行一个）"
                  multiline
                  minRows={6}
                  helperText="保存已有模板时版本号会自动递增"
                  value={(editor.value.prompts || [])
                    .map((item) => item.prompt)
                    .join('\n')}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      value: {
                        ...editor.value,
                        prompts: e.target.value
                          .split('\n')
                          .map((prompt, index) => ({
                            key:
                              editor.value.prompts?.[index]?.key ||
                              `item-${index + 1}`,
                            prompt,
                          })),
                      },
                    })
                  }
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditor(null)}>取消</Button>
            <Button
              variant="contained"
              disabled={saving || !editor?.value.name}
              onClick={save}
            >
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default WritingAdmin;
