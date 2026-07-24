import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import SearchIcon from '@mui/icons-material/Search';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import WritingCard from '../../components/writing/WritingCard';
import TopicChip from '../../components/writing/TopicChip';
import Loading from '../../components/Loading';
import Empty from '../../components/Empty';
import {
  WritingGroup,
  WritingPartner,
  WritingPost,
  WritingTopic,
} from '../../netlify/types';
import {
  writingGroupsApi,
  writingsApi,
  writingTopicsApi,
} from '../../netlify/config';
import { isOrganizer, isUserLoggedIn } from '../../utils/user';
import { useGlobalSnackbar } from '../../context/app';

const PAGE_SIZE = 9;

function matchesTopic(topic: WritingTopic, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  const value = `${topic.name} ${topic.slug || ''}`.toLocaleLowerCase();
  if (value.includes(normalizedQuery)) return true;

  let queryIndex = 0;
  for (const character of value) {
    if (character === normalizedQuery[queryIndex]) queryIndex += 1;
    if (queryIndex === normalizedQuery.length) return true;
  }
  return false;
}

function formatTimelineDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

const WritingCircle: React.FC = () => {
  const navigate = useNavigate();
  const snackbar = useGlobalSnackbar();
  const [searchParams, setSearchParams] = useSearchParams();
  const [topics, setTopics] = useState<WritingTopic[]>([]);
  const [posts, setPosts] = useState<WritingPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [topicsExpanded, setTopicsExpanded] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [topicQuery, setTopicQuery] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [groups, setGroups] = useState<WritingGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState('');
  const [groupsExpanded, setGroupsExpanded] = useState(false);
  const [partners, setPartners] = useState<WritingPartner[]>([]);

  const scope =
    searchParams.get('scope') === 'mine'
      ? 'mine'
      : searchParams.get('scope') === 'partners'
        ? 'partners'
        : 'all';
  const topicId = searchParams.get('topic') || '';
  const sort = searchParams.get('sort') === 'oldest' ? 'oldest' : 'latest';
  const dateFrom = /^\d{4}-\d{2}-\d{2}$/.test(
    searchParams.get('date_from') || ''
  )
    ? searchParams.get('date_from') || ''
    : '';
  const dateTo = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get('date_to') || '')
    ? searchParams.get('date_to') || ''
    : '';
  const creator = searchParams.get('creator') || '';
  const groupId = searchParams.get('group') || '';
  const parsedPage = Number(searchParams.get('page'));
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  useEffect(() => {
    let active = true;
    writingTopicsApi.getAll().then((response) => {
      if (active && response.success) {
        setTopics(response.data?.topics || []);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setGroupsLoading(true);
    setGroupsError('');
    writingGroupsApi
      .list()
      .then((response) => {
        if (!active) return;
        if (response.success) setGroups(response.data?.groups || []);
        else setGroupsError(response.error || '加载讨论组失败');
      })
      .catch(() => {
        if (active) setGroupsError('加载讨论组失败，请稍后重试');
      })
      .finally(() => {
        if (active) setGroupsLoading(false);
      });
    if (isUserLoggedIn()) {
      writingGroupsApi.myPartners().then((response) => {
        if (active && response.success)
          setPartners(response.data?.partners || []);
      });
    }
    return () => {
      active = false;
    };
  }, [retryCount]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    writingsApi
      .list({
        scope,
        group_id: groupId || undefined,
        topic_ids: topicId ? [topicId] : undefined,
        sort,
        page,
        page_size: PAGE_SIZE,
        creator: creator || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      .then((response) => {
        if (!active) return;
        if (!response.success) {
          setError(response.error || '加载书写失败');
          return;
        }
        setPosts(response.data?.records || []);
        setTotal(response.data?.total || 0);
      })
      .catch(() => {
        if (active) setError('加载书写失败，请稍后重试');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    creator,
    dateFrom,
    dateTo,
    groupId,
    page,
    retryCount,
    scope,
    sort,
    topicId,
  ]);

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) next.delete(key);
      else next.set(key, value);
    });
    setSearchParams(next);
  };

  const handleScopeChange = (_event: React.SyntheticEvent, value: string) => {
    if ((value === 'mine' || value === 'partners') && !isUserLoggedIn()) {
      navigate(
        `/login?redirect=${encodeURIComponent(`/writing-circle?scope=${value}`)}`
      );
      return;
    }
    updateParams({
      scope: value === 'mine' || value === 'partners' ? value : null,
      page: null,
    });
  };

  const enterGroup = (selectedGroupId: string) => {
    updateParams({ group: selectedGroupId, scope: null, page: null });
    setGroupsExpanded(false);
  };

  const applyToGroup = async (groupId: string) => {
    if (!isUserLoggedIn()) {
      navigate(`/login?redirect=${encodeURIComponent('/writing-circle')}`);
      return;
    }
    const response = await writingGroupsApi.apply(groupId);
    if (!response.success) {
      snackbar.error(response.error || '申请失败');
      return;
    }
    snackbar.success('申请已提交，请等待审核');
    setRetryCount((count) => count + 1);
  };

  const handleCreate = () => {
    if (!isUserLoggedIn()) {
      navigate(`/login?redirect=${encodeURIComponent('/writing-circle/new')}`);
      return;
    }
    navigate('/writing-circle/new');
  };

  const handleDateRangeChange = (from: Dayjs | null, to: Dayjs | null) => {
    if (
      from &&
      to &&
      (to.isBefore(from, 'day') || to.isAfter(from.add(1, 'year'), 'day'))
    ) {
      snackbar.warning('搜索时间范围最多为一年');
      return;
    }
    updateParams({
      date_from: from?.format('YYYY-MM-DD') || null,
      date_to: to?.format('YYYY-MM-DD') || null,
      page: null,
    });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const orderedTopics = topicId
    ? [
        ...topics.filter((topic) => topic.id === topicId),
        ...topics.filter((topic) => topic.id !== topicId),
      ]
    : topics;
  const canCollapseTopics = topics.length > 4;
  const matchingTopics = orderedTopics.filter((topic) =>
    matchesTopic(topic, topicQuery)
  );
  const isSearchingTopics = Boolean(topicQuery.trim());
  const activeFilterCount = [
    creator,
    dateFrom,
    dateTo,
    topicId,
    sort === 'oldest' ? sort : '',
  ].filter(Boolean).length;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f7f5f2',
        pt: { xs: 3, md: 6 },
        pb: { xs: 14, sm: 12 },
      }}
    >
      <Container maxWidth="lg">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            mb: 3,
            borderRadius: 4,
            bgcolor: '#fffaf4',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography
                variant="h4"
                component="h1"
                fontWeight={750}
                gutterBottom
                sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' } }}
              >
                书写圈子
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ maxWidth: 680 }}
              >
                用话题和书写模板记录自我观察，让零散的感受慢慢成为可以回看的成长轨迹。
              </Typography>
            </Box>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="flex-end"
              spacing={1}
              sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
            >
              {groupId && (
                <Chip
                  icon={<GroupsOutlinedIcon />}
                  size="small"
                  sx={{
                    alignSelf: { xs: 'flex-start', sm: 'center' },
                    maxWidth: '100%',
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
                  label={
                    groups.find((group) => group.id === groupId)?.name ||
                    '当前讨论组'
                  }
                />
              )}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent={{ xs: 'space-between', sm: 'flex-end' }}
                spacing={1}
              >
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={
                    groupsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />
                  }
                  onClick={() => setGroupsExpanded((expanded) => !expanded)}
                >
                  讨论组
                  {groups.length > 0 ? `（${groups.length}）` : ''}
                </Button>
                {groupId && (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => updateParams({ group: null, page: null })}
                  >
                    返回全部
                  </Button>
                )}
              </Stack>
            </Stack>
          </Stack>
          <Collapse in={groupsExpanded} unmountOnExit>
            <Box
              sx={{
                mt: 2,
                pt: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                申请加入后，才能看到组内成员发布的专属书写。
              </Typography>
              {groupsError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {groupsError}
                </Alert>
              )}
              {groupsLoading && <Loading />}
              {!groupsLoading && !groupsError && groups.length === 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  暂无可加入的讨论组
                </Alert>
              )}
              {groups.length > 0 && (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, minmax(0, 1fr))',
                      md: 'repeat(4, minmax(0, 1fr))',
                    },
                    gap: 1.25,
                    mt: 1.25,
                  }}
                >
                  {groups.map((group) => (
                    <Paper
                      key={group.id}
                      variant="outlined"
                      sx={{
                        p: 1.25,
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={700} noWrap>
                        {group.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          my: 0.5,
                          minHeight: 32,
                          overflow: 'hidden',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2,
                        }}
                      >
                        {group.description || '一起持续书写与交流。'}
                      </Typography>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="caption">
                          {group.member_count} 位成员
                        </Typography>
                        {group.membership_status === 'approved' ? (
                          <Button
                            size="small"
                            sx={{ minWidth: 0, px: 1 }}
                            variant={
                              groupId === group.id ? 'contained' : 'outlined'
                            }
                            onClick={() => enterGroup(group.id)}
                          >
                            {groupId === group.id ? '当前讨论组' : '进入'}
                          </Button>
                        ) : group.membership_status === 'pending' ? (
                          <Chip size="small" label="审核中" />
                        ) : (
                          <Button
                            size="small"
                            sx={{ minWidth: 0, px: 1 }}
                            onClick={() => applyToGroup(group.id)}
                          >
                            申请加入
                          </Button>
                        )}
                      </Stack>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>
          </Collapse>
        </Paper>

        {groupId && (
          <Alert severity="info" sx={{ mb: 2 }}>
            正在查看「
            {groups.find((group) => group.id === groupId)?.name || '讨论组'}
            」的组内书写，仅该讨论组成员可见。
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            mb: 3,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', sm: 'center' }}
              spacing={2}
              useFlexGap
              sx={{ flexWrap: 'wrap' }}
            >
              <Tabs
                value={scope}
                onChange={handleScopeChange}
                variant="fullWidth"
                sx={{ width: { xs: '100%', sm: 'auto' } }}
              >
                <Tab value="all" label="全部书写" />
                <Tab value="mine" label="我的书写" />
                <Tab value="partners" label="我的搭子" />
              </Tabs>
              <Button
                size="small"
                color="inherit"
                endIcon={
                  filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />
                }
                onClick={() => setFiltersExpanded((expanded) => !expanded)}
                sx={{ flexShrink: 0, color: 'text.secondary' }}
              >
                {filtersExpanded
                  ? '收起筛选'
                  : activeFilterCount
                    ? `展开筛选（${activeFilterCount}）`
                    : '展开筛选'}
              </Button>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1}
                sx={{
                  display: filtersExpanded ? 'flex' : 'none',
                  width: '100%',
                }}
              >
                <TextField
                  size="small"
                  value={creator}
                  onChange={(event) =>
                    updateParams({
                      creator: event.target.value || null,
                      page: null,
                    })
                  }
                  placeholder="创造者名字"
                  aria-label="按创造者名字搜索"
                  sx={{ minWidth: 150 }}
                />
                <LocalizationProvider
                  dateAdapter={AdapterDayjs}
                  adapterLocale="zh-cn"
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <DatePicker
                      label="开始日期"
                      value={dateFrom ? dayjs(dateFrom) : null}
                      onChange={(value) =>
                        handleDateRangeChange(
                          value,
                          dateTo ? dayjs(dateTo) : null
                        )
                      }
                      maxDate={dateTo ? dayjs(dateTo) : dayjs()}
                      slotProps={{
                        textField: {
                          size: 'small',
                          sx: { minWidth: 145 },
                        },
                      }}
                    />
                    <Typography color="text.secondary">至</Typography>
                    <DatePicker
                      label="结束日期"
                      value={dateTo ? dayjs(dateTo) : null}
                      onChange={(value) =>
                        handleDateRangeChange(
                          dateFrom ? dayjs(dateFrom) : null,
                          value
                        )
                      }
                      minDate={dateFrom ? dayjs(dateFrom) : undefined}
                      maxDate={
                        dateFrom
                          ? dayjs(dateFrom).add(1, 'year').isBefore(dayjs())
                            ? dayjs(dateFrom).add(1, 'year')
                            : dayjs()
                          : dayjs()
                      }
                      slotProps={{
                        textField: {
                          size: 'small',
                          sx: { minWidth: 145 },
                        },
                      }}
                    />
                  </Stack>
                </LocalizationProvider>
                <FormControl
                  size="small"
                  sx={{ minWidth: { xs: 115, sm: 130 } }}
                >
                  <InputLabel id="writing-sort-label">时间排序</InputLabel>
                  <Select
                    labelId="writing-sort-label"
                    label="时间排序"
                    value={sort}
                    onChange={(event) =>
                      updateParams({
                        sort: event.target.value === 'oldest' ? 'oldest' : null,
                        page: null,
                      })
                    }
                  >
                    <MenuItem value="latest">最新发布</MenuItem>
                    <MenuItem value="oldest">最早发布</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Stack>

            <Collapse in={filtersExpanded} unmountOnExit>
              <Box>
                <TextField
                  fullWidth
                  size="small"
                  value={topicQuery}
                  onChange={(event) => setTopicQuery(event.target.value)}
                  placeholder="按书写话题名称搜索"
                  aria-label="搜索话题"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <SearchIcon
                          color="action"
                          sx={{ mr: 1, fontSize: 20 }}
                        />
                      ),
                    },
                  }}
                  sx={{
                    display: { xs: 'flex', sm: 'flex' },
                    mb: 2,
                    maxWidth: 420,
                  }}
                />
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={2}
                  sx={{ mb: 1.25 }}
                >
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <LocalOfferOutlinedIcon
                      color="action"
                      sx={{ fontSize: 19 }}
                    />
                    <Typography variant="subtitle2" fontWeight={700}>
                      按话题筛选
                    </Typography>
                    {topicId && (
                      <Typography variant="caption" color="text.secondary">
                        已选 1 个
                      </Typography>
                    )}
                  </Stack>
                  {canCollapseTopics && !isSearchingTopics && (
                    <Button
                      size="small"
                      color="inherit"
                      endIcon={
                        topicsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />
                      }
                      onClick={() => setTopicsExpanded((expanded) => !expanded)}
                      aria-expanded={topicsExpanded}
                      aria-controls="writing-topic-filters"
                      sx={{ color: 'text.secondary', flexShrink: 0 }}
                    >
                      {topicsExpanded ? '收起' : `展开全部（${topics.length}）`}
                    </Button>
                  )}
                </Stack>

                <Collapse
                  in={topicsExpanded || !canCollapseTopics || isSearchingTopics}
                  collapsedSize={40}
                  timeout={240}
                >
                  <Box
                    id="writing-topic-filters"
                    sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}
                  >
                    {!isSearchingTopics && (
                      <Chip
                        label="全部话题"
                        variant="outlined"
                        onClick={() =>
                          updateParams({ topic: null, page: null })
                        }
                        sx={{
                          borderColor: !topicId ? '#496a61' : '#d9d1c7',
                          bgcolor: !topicId ? '#496a61' : '#fcfaf7',
                          color: !topicId ? '#fff' : '#625a52',
                          fontWeight: !topicId ? 700 : 500,
                          '&:hover': {
                            bgcolor: !topicId ? '#3f5d55' : '#f3eee8',
                          },
                        }}
                      />
                    )}
                    {matchingTopics.map((topic) => (
                      <TopicChip
                        key={topic.id}
                        topic={topic}
                        selected={topic.id === topicId}
                        onClick={() =>
                          updateParams({
                            topic: topic.id === topicId ? null : topic.id,
                            page: null,
                          })
                        }
                      />
                    ))}
                    {isSearchingTopics && matchingTopics.length === 0 && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ py: 0.75 }}
                      >
                        没有找到“{topicQuery.trim()}”相关话题
                      </Typography>
                    )}
                  </Box>
                </Collapse>
              </Box>
            </Collapse>
          </Stack>
        </Paper>

        {scope === 'partners' && (
          <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
            <Typography fontWeight={750} gutterBottom>
              我的书写搭子
            </Typography>
            {partners.length ? (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {partners.map((partner) => (
                  <Chip
                    key={partner.pairing_id}
                    label={`${partner.user.name} · ${partner.group_name}`}
                    color="secondary"
                    variant="outlined"
                  />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                暂未分配书写搭子，请联系圈子管理员。
              </Typography>
            )}
          </Paper>
        )}

        {loading ? (
          <Loading message="正在加载书写..." />
        ) : error ? (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setRetryCount((count) => count + 1)}
              >
                重试
              </Button>
            }
          >
            {error}
          </Alert>
        ) : posts.length === 0 ? (
          <Paper elevation={0} sx={{ p: 6, borderRadius: 3 }}>
            <Empty
              message={
                scope === 'mine'
                  ? '还没有书写记录'
                  : scope === 'partners'
                    ? '搭子暂时还没有公开书写'
                    : '还没有公开书写'
              }
              description="从一次真实的自我观察开始吧"
            />
          </Paper>
        ) : (
          <>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2 }}
              aria-live="polite"
            >
              共 {total} 篇书写{topicId ? '符合当前话题' : ''}
            </Typography>
            {scope === 'mine' ? (
              <Box sx={{ maxWidth: 860, mx: 'auto', py: { xs: 2, sm: 3 } }}>
                {posts.map((post, index) => (
                  <Box
                    key={post.id}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '28px minmax(0, 1fr)',
                        sm: '190px 28px minmax(0, 1fr)',
                      },
                      columnGap: { xs: 1.5, sm: 2.5 },
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: { xs: 'none', sm: 'block' },
                        textAlign: 'right',
                        pt: 1.25,
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatTimelineDate(post.created_at)}
                    </Typography>
                    <Box
                      sx={{
                        gridColumn: { xs: 1, sm: 2 },
                        gridRow: 1,
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'center',
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          top: 16,
                          bottom:
                            index === posts.length - 1
                              ? 'calc(100% - 17px)'
                              : -16,
                          width: 2,
                          bgcolor: '#d8cec2',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          mt: 1.25,
                          borderRadius: '50%',
                          bgcolor: '#e87545',
                          border: '3px solid #fff',
                          outline: '1px solid #e87545',
                          zIndex: 1,
                        }}
                      />
                    </Box>
                    <Box
                      sx={{
                        gridColumn: { xs: 2, sm: 3 },
                        pb: index === posts.length - 1 ? 0 : { xs: 5, sm: 6 },
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: { xs: 'block', sm: 'none' },
                          mb: 0.75,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatTimelineDate(post.created_at)}
                      </Typography>
                      <WritingCard
                        post={post}
                        onClick={(id) => navigate(`/writing-circle/${id}`)}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    md: 'repeat(3, minmax(0, 1fr))',
                  },
                  gap: 3,
                }}
              >
                {posts.map((post) => (
                  <WritingCard
                    key={post.id}
                    post={post}
                    onClick={(id) => navigate(`/writing-circle/${id}`)}
                  />
                ))}
              </Box>
            )}

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                <Pagination
                  page={page}
                  count={totalPages}
                  color="primary"
                  onChange={(_event, value) => {
                    updateParams({ page: value === 1 ? null : String(value) });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </Box>
            )}
          </>
        )}

        <Paper
          square
          elevation={0}
          sx={{
            position: 'fixed',
            zIndex: (theme) => theme.zIndex.appBar,
            left: 0,
            right: 0,
            bottom: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(12px)',
            pb: 'env(safe-area-inset-bottom)',
          }}
        >
          <Stack
            direction="row"
            justifyContent="center"
            spacing={1.5}
            sx={{
              maxWidth: 480,
              mx: 'auto',
              px: { xs: 2, sm: 3 },
              py: 1.25,
            }}
          >
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
              size="large"
              sx={{ flex: 1, minWidth: 0 }}
            >
              开始书写
            </Button>
            {isOrganizer() && (
              <Button
                variant="outlined"
                startIcon={<AdminPanelSettingsIcon />}
                onClick={() => navigate('/admin/writing-circle')}
                size="large"
                sx={{ flex: 1, minWidth: 0 }}
              >
                圈子后台
              </Button>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default WritingCircle;
