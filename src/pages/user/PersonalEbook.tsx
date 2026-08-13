import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import Loading from '../../components/Loading';
import Empty from '../../components/Empty';
import { ebookApi } from '../../netlify/config';
import {
  EbookSource,
  PersonalEbook as PersonalEbookData,
} from '../../netlify/types';
import { buildEbookSections, buildEbookTxt, EbookOrder } from './ebook';
import styles from './PersonalEbook.module.css';

const SOURCE_META: Record<EbookSource, { label: string; color: string }> = {
  card: { label: '金句卡片', color: '#b25e3d' },
  writing: { label: '书写圈子', color: '#496a61' },
  response: { label: '活动回应', color: '#76639a' },
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));

const PersonalEbook: React.FC = () => {
  const [ebook, setEbook] = useState<PersonalEbookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<EbookOrder>('time');
  const [sources, setSources] = useState<EbookSource[]>([
    'card',
    'writing',
    'response',
  ]);

  useEffect(() => {
    let active = true;
    ebookApi
      .getMine()
      .then((response) => {
        if (!active) return;
        if (!response.success || !response.data)
          setError(response.error || '电子书加载失败');
        else setEbook(response.data);
      })
      .catch(() => active && setError('电子书加载失败，请稍后重试'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const sections = useMemo(
    () => buildEbookSections(ebook?.chapters || [], order, sources),
    [ebook?.chapters, order, sources]
  );
  const visibleCount = sections.reduce((ids, section) => {
    section.chapters.forEach((chapter) => ids.add(chapter.id));
    return ids;
  }, new Set<string>()).size;

  const downloadTxt = () => {
    const text = buildEbookTxt(ebook?.chapters || [], sources);
    const blob = new Blob([`\uFEFF${text}`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${ebook?.owner.name || '我的'}启发之书.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading)
    return (
      <Box className={styles.page}>
        <Loading />
      </Box>
    );
  if (error)
    return (
      <Container sx={{ py: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );

  return (
    <Box className={styles.page}>
      <Container maxWidth="xl">
        <Box className={styles.hero}>
          <Typography className={styles.eyebrow} variant="overline">
            MY INSPIRATION BOOK
          </Typography>
          <Typography
            className={styles.title}
            variant="h2"
            component="h1"
            sx={{ mt: 1, fontWeight: 700 }}
          >
            {ebook?.owner.name || '我'}的启发之书
          </Typography>
          <Typography
            className={styles.subtitle}
            variant="body1"
            sx={{ mt: 2 }}
          >
            把散落在金句卡片、书写圈子与活动现场的思考，编成一本持续生长的个人电子书。
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 3, flexWrap: 'wrap', gap: 1 }}
          >
            <Chip
              label={`${ebook?.chapters.length || 0} 篇收藏`}
              sx={{ bgcolor: 'rgba(255,255,255,.16)', color: 'white' }}
            />
            <Chip
              label="仅自己可见"
              sx={{ bgcolor: 'rgba(255,255,255,.16)', color: 'white' }}
            />
          </Stack>
        </Box>

        <Paper
          className={styles.controls}
          elevation={0}
          sx={{ mt: 3, p: 2.5, borderRadius: 3 }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            gap={2}
            justifyContent="space-between"
            alignItems={{ md: 'center' }}
          >
            <Stack direction="row" gap={1} flexWrap="wrap">
              {(Object.keys(SOURCE_META) as EbookSource[]).map((source) => (
                <Chip
                  key={source}
                  clickable
                  label={SOURCE_META[source].label}
                  variant={sources.includes(source) ? 'filled' : 'outlined'}
                  onClick={() =>
                    setSources((current) =>
                      current.includes(source)
                        ? current.filter((item) => item !== source)
                        : [...current, source]
                    )
                  }
                  sx={
                    sources.includes(source)
                      ? { bgcolor: SOURCE_META[source].color, color: '#fff' }
                      : {}
                  }
                />
              ))}
            </Stack>
            <Stack direction="row" gap={1}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={order}
                onChange={(_, value: EbookOrder | null) =>
                  value && setOrder(value)
                }
              >
                <ToggleButton value="time">
                  <FormatListBulletedIcon fontSize="small" sx={{ mr: 0.5 }} />
                  按时间
                </ToggleButton>
                <ToggleButton value="topic">
                  <LocalOfferOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
                  按主题
                </ToggleButton>
              </ToggleButtonGroup>
              <Button
                variant="outlined"
                startIcon={<DownloadOutlinedIcon />}
                onClick={downloadTxt}
                disabled={visibleCount === 0}
              >
                导出 TXT
              </Button>
              <Button
                variant="outlined"
                startIcon={<PrintOutlinedIcon />}
                onClick={() => window.print()}
              >
                打印 / PDF
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {visibleCount === 0 ? (
          <Paper sx={{ mt: 3, p: 7 }}>
            <Empty description="还没有可编入电子书的内容，或当前来源均已隐藏" />
          </Paper>
        ) : (
          <Box className={styles.workspace}>
            <Paper
              component="nav"
              className={styles.toc}
              elevation={0}
              sx={{ p: 3 }}
              aria-label="电子书目录"
            >
              <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
                <AutoStoriesOutlinedIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  目录
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              {sections.map((section) => (
                <Box key={section.id} sx={{ mb: 2.5 }}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    className={
                      order === 'time' ? styles.tocDate : styles.tocTopic
                    }
                  >
                    {section.title}
                  </Typography>
                  {section.chapters.map((chapter) => (
                    <a
                      className={styles.tocLink}
                      href={`#${chapter.id}`}
                      key={`${section.id}-${chapter.id}`}
                    >
                      {chapter.title}
                    </a>
                  ))}
                </Box>
              ))}
            </Paper>

            <main className={styles.book}>
              {sections.map((section) => (
                <section key={section.id}>
                  <Typography
                    className={styles.sectionTitle}
                    variant="h4"
                    component="h2"
                  >
                    {section.title}
                  </Typography>
                  {section.chapters.map((chapter) => (
                    <article
                      className={styles.chapter}
                      id={chapter.id}
                      key={`${section.id}-${chapter.id}`}
                    >
                      <Stack
                        direction="row"
                        gap={1}
                        alignItems="center"
                        flexWrap="wrap"
                      >
                        <Chip
                          size="small"
                          label={SOURCE_META[chapter.source].label}
                          sx={{
                            bgcolor: SOURCE_META[chapter.source].color,
                            color: '#fff',
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(chapter.created_at)}
                        </Typography>
                      </Stack>
                      <Typography
                        className={styles.chapterTitle}
                        variant="h4"
                        component="h3"
                        sx={{ mt: 2, mb: 2, fontWeight: 700 }}
                      >
                        {chapter.title}
                      </Typography>
                      {chapter.image_urls.map((url) => (
                        <img
                          className={styles.image}
                          src={url}
                          alt=""
                          key={url}
                        />
                      ))}
                      {chapter.response_items?.length ? (
                        chapter.response_items.map((item, index) => (
                          <Box
                            className={styles.response}
                            key={`${chapter.id}-${index}`}
                          >
                            <Typography variant="subtitle2" fontWeight={700}>
                              {item.question}
                            </Typography>
                            <Typography className={styles.content}>
                              {item.answer || '—'}
                            </Typography>
                          </Box>
                        ))
                      ) : (
                        <Typography
                          className={`${styles.content} ${chapter.source === 'card' ? styles.quote : ''}`}
                        >
                          {chapter.content}
                        </Typography>
                      )}
                      {chapter.detail_url && (
                        <Button
                          component={Link}
                          to={chapter.detail_url}
                          size="small"
                          sx={{ mt: 2 }}
                        >
                          查看原文
                        </Button>
                      )}
                    </article>
                  ))}
                </section>
              ))}
            </main>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default PersonalEbook;
