import React, { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import html2canvas from 'html2canvas';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Grid,
  TextField,
  InputAdornment,
  IconButton,
  Pagination,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import useResponsive from '@/hooks/useResponsive';

import { getFontColorForGradient, gradientClasses } from '@/constants/gradient';
import { loadQRCodeLibrary } from '@/utils/share';

import { weeklyCardsApi } from '../../netlify/config';
import { useGlobalSnackbar } from '@/context/app';
import Empty from '@/components/Empty';
import Loading from '@/components/Loading';
import { WeeklyCard } from '../../netlify/services/weeklyCards';

export interface WeeklyCardItem extends WeeklyCard {
  gradient: string;
}

const EXPORT_WIDTH = 720;
const EXPORT_HEIGHT = 1280;
const MAX_EXPORT_HEIGHT = 1680;
const EXPORT_TARGET_FILL_HEIGHT = 1120;
const EXPORT_PADDING = 56;
const EXPORT_QR_SIZE = 96;
const BEIJING_TIME_ZONE = 'Asia/Shanghai';

type ExportTypography = {
  title: number;
  quote: number;
  detail: number;
};

const waitForLayout = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

const parseCssColor = (color: string) => {
  const normalized = color.trim();
  const rgbMatch = normalized.match(/^rgba?\(([^)]+)\)$/i);

  if (rgbMatch) {
    const [r, g, b] = rgbMatch[1]
      .replace(/\//g, ' ')
      .split(/[,\s]+/)
      .filter(Boolean)
      .slice(0, 3)
      .map(Number);

    if ([r, g, b].every((value) => Number.isFinite(value))) {
      return { r, g, b };
    }
  }

  const hexMatch = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!hexMatch) return null;

  const hex = hexMatch[1];
  const expanded =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : hex;

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
};

const getRelativeLuminance = ({
  r,
  g,
  b,
}: {
  r: number;
  g: number;
  b: number;
}) => {
  const [sr, sg, sb] = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
};

const toRgba = (color: string, alpha: number) => {
  const rgb = parseCssColor(color);
  if (!rgb) return `rgba(44, 62, 80, ${alpha})`;

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const getQrPanelStyles = (qrColor: string) => {
  const rgb = parseCssColor(qrColor);
  const isLightQr = rgb ? getRelativeLuminance(rgb) > 0.72 : false;

  return {
    backgroundColor: isLightQr
      ? 'rgba(15, 23, 42, 0.74)'
      : 'rgba(255, 255, 255, 0.86)',
    borderColor: toRgba(qrColor, isLightQr ? 0.36 : 0.24),
  };
};

const getWeeklyCardGradient = (card: WeeklyCard, index: number) => {
  const explicitGradient = (card as WeeklyCard & { gradient_class?: string })
    .gradient_class;
  if (explicitGradient && gradientClasses.includes(explicitGradient)) {
    return explicitGradient;
  }

  const seed =
    `${card.id || ''}${card.episode || ''}${card.title || ''}` || `${index}`;
  let hash = 0;

  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }

  return (
    gradientClasses[Math.abs(hash) % gradientClasses.length] ||
    'card-gradient-1'
  );
};

const toValidDate = (dateValue?: string | null) => {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatBeijingDate = (dateValue?: string | null) => {
  const date = toValidDate(dateValue);
  if (!date) return '';

  return date.toLocaleDateString('zh-CN', {
    timeZone: BEIJING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const getBeijingYear = (dateValue?: string | null) => {
  const date = toValidDate(dateValue);
  if (!date) return '';

  const yearPart = new Intl.DateTimeFormat('zh-CN', {
    timeZone: BEIJING_TIME_ZONE,
    year: 'numeric',
  })
    .formatToParts(date)
    .find((part) => part.type === 'year');

  return yearPart?.value || date.getFullYear().toString();
};

const getInitialExportTypography = (card: WeeklyCardItem): ExportTypography => {
  const detailText = (card.detail || '').replace(/<[^>]+>/g, '');
  const textLength =
    (card.title || '').length + (card.quote || '').length + detailText.length;

  if (textLength < 60) {
    return { title: 42, quote: 38, detail: 28 };
  }

  if (textLength < 120) {
    return { title: 38, quote: 32, detail: 24 };
  }

  if (textLength < 220) {
    return { title: 34, quote: 28, detail: 21 };
  }

  if (textLength < 360) {
    return { title: 30, quote: 24, detail: 18 };
  }

  return { title: 27, quote: 21, detail: 16 };
};

const applyExportTypography = (
  clone: HTMLElement,
  typography: ExportTypography
) => {
  const titleEl = clone.querySelector('.card-title') as HTMLElement | null;
  const quoteBox = clone.querySelector('.card-quote-box') as HTMLElement | null;
  const quoteEl = clone.querySelector('.card-quote') as HTMLElement | null;
  const detailBox = clone.querySelector(
    '.card-detail-box'
  ) as HTMLElement | null;
  const footerBox = clone.querySelector(
    '.card-footer-box'
  ) as HTMLElement | null;
  const footerPrimary = clone.querySelector(
    '.card-footer-primary'
  ) as HTMLElement | null;
  const footerMeta = clone.querySelector(
    '.card-footer-meta'
  ) as HTMLElement | null;

  if (titleEl) {
    titleEl.style.fontSize = `${typography.title}px`;
    titleEl.style.lineHeight = `${Math.round(typography.title * 1.25)}px`;
    titleEl.style.marginBottom = `${Math.round(typography.title * 0.55)}px`;
  }

  if (quoteBox) {
    quoteBox.style.padding = `${Math.round(typography.quote * 0.65)}px`;
    quoteBox.style.paddingLeft = `${Math.round(typography.quote * 1.2)}px`;
    quoteBox.style.marginBottom = `${Math.round(typography.quote * 0.85)}px`;
  }

  if (quoteEl) {
    quoteEl.style.fontSize = `${typography.quote}px`;
    quoteEl.style.lineHeight = `${Math.round(typography.quote * 1.55)}px`;
  }

  if (detailBox) {
    const detailLineHeight = Math.round(typography.detail * 1.65);
    detailBox.style.fontSize = `${typography.detail}px`;
    detailBox.style.lineHeight = `${detailLineHeight}px`;
    detailBox.style.marginBottom = '0';
    detailBox.style.flexGrow = '0';
    detailBox.style.whiteSpace = 'normal';
    detailBox.style.wordBreak = 'break-word';
    detailBox.style.overflowWrap = 'break-word';

    detailBox.querySelectorAll('p').forEach((p) => {
      const el = p as HTMLElement;
      el.style.lineHeight = `${detailLineHeight}px`;
      el.style.margin = `0 0 ${Math.round(typography.detail * 0.9)}px 0`;
    });

    detailBox.querySelectorAll('li').forEach((li) => {
      const el = li as HTMLElement;
      el.style.lineHeight = `${detailLineHeight}px`;
      el.style.marginBottom = `${Math.round(typography.detail * 0.45)}px`;
    });
  }

  if (footerBox) {
    footerBox.style.marginTop = '28px';
    footerBox.style.paddingRight = `${EXPORT_QR_SIZE + 24}px`;
    footerBox.style.alignItems = 'flex-start';
  }

  if (footerPrimary) {
    footerPrimary.style.fontSize = `${Math.max(15, typography.detail)}px`;
    footerPrimary.style.lineHeight = `${Math.round(Math.max(15, typography.detail) * 1.4)}px`;
  }

  if (footerMeta) {
    footerMeta.style.fontSize = `${Math.max(13, typography.detail - 2)}px`;
    footerMeta.style.lineHeight = `${Math.round(Math.max(13, typography.detail - 2) * 1.4)}px`;
  }
};

const normalizeExportText = (clone: HTMLElement) => {
  const contentBox = clone.querySelector(
    '.card-export-content'
  ) as HTMLElement | null;
  const detailBox = clone.querySelector(
    '.card-detail-box'
  ) as HTMLElement | null;

  if (contentBox) {
    contentBox.style.display = 'flex';
    contentBox.style.flex = '1 1 auto';
    contentBox.style.flexDirection = 'column';
    contentBox.style.justifyContent = 'center';
    contentBox.style.minHeight = '0';
    contentBox.style.overflow = 'hidden';
  }

  if (detailBox) {
    detailBox.querySelectorAll('p, div, li, ul, ol').forEach((node) => {
      const el = node as HTMLElement;
      el.style.position = 'static';
    });
  }

  clone.querySelectorAll('br').forEach((br) => {
    const spacer = document.createElement('span');
    spacer.style.display = 'block';
    spacer.style.width = '100%';
    spacer.style.height = '10px';
    br.parentNode?.replaceChild(spacer, br);
  });

  // Safari + html2canvas 在中文连续文本上偶尔会把行高算错。
  // 导出前只在隐藏 clone 中逐字包 span，可以避免影响页面上的真实 DOM。
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null);
  const textNodes: Text[] = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue && node.nodeValue.trim() !== '') {
      if (
        node.parentElement &&
        ['STYLE', 'SCRIPT'].includes(node.parentElement.tagName)
      )
        continue;
      textNodes.push(node as Text);
    }
  }

  textNodes.forEach((textNode) => {
    if (!textNode.parentNode) return;
    const text = textNode.nodeValue || '';
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < text.length; i++) {
      const span = document.createElement('span');
      span.style.display = 'inline';
      span.textContent = text[i];
      fragment.appendChild(span);
    }
    textNode.parentNode.replaceChild(fragment, textNode);
  });
};

const measureExportHeight = async (clone: HTMLElement) => {
  await waitForLayout();
  return Math.ceil(clone.scrollHeight);
};

const fitExportTypography = async (
  clone: HTMLElement,
  initialTypography: ExportTypography
) => {
  let typography = { ...initialTypography };
  const minTypography: ExportTypography = { title: 22, quote: 18, detail: 14 };
  const maxTypography: ExportTypography = { title: 58, quote: 52, detail: 34 };

  applyExportTypography(clone, typography);
  let measuredHeight = await measureExportHeight(clone);

  while (
    measuredHeight < EXPORT_TARGET_FILL_HEIGHT &&
    (typography.title < maxTypography.title ||
      typography.quote < maxTypography.quote ||
      typography.detail < maxTypography.detail)
  ) {
    typography = {
      title: Math.min(maxTypography.title, typography.title + 1),
      quote: Math.min(maxTypography.quote, typography.quote + 1),
      detail: Math.min(maxTypography.detail, typography.detail + 1),
    };
    applyExportTypography(clone, typography);
    measuredHeight = await measureExportHeight(clone);
  }

  while (
    measuredHeight > MAX_EXPORT_HEIGHT &&
    (typography.title > minTypography.title ||
      typography.quote > minTypography.quote ||
      typography.detail > minTypography.detail)
  ) {
    typography = {
      title: Math.max(minTypography.title, typography.title - 1),
      quote: Math.max(minTypography.quote, typography.quote - 1),
      detail: Math.max(minTypography.detail, typography.detail - 1),
    };
    applyExportTypography(clone, typography);
    measuredHeight = await measureExportHeight(clone);
  }

  return measuredHeight;
};

const getFinalExportHeight = (measuredHeight: number) => {
  if (measuredHeight <= EXPORT_HEIGHT) return EXPORT_HEIGHT;
  if (measuredHeight <= MAX_EXPORT_HEIGHT) return measuredHeight;
  return measuredHeight;
};

const WeeklyCards: React.FC = () => {
  marked.setOptions({ breaks: true });
  const location = useLocation();
  const { episode: episodeFromPath } = useParams<{ episode?: string }>();
  const [cards, setCards] = useState<WeeklyCardItem[]>([]);
  const [filteredCards, setFilteredCards] = useState<WeeklyCardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingAll, setLoadingAll] = useState<boolean>(false);
  const [showAll, setShowAll] = useState<boolean>(false);
  const [allPage, setAllPage] = useState<number>(1);
  const ALL_PAGE_SIZE = 10;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const { isMobile } = useResponsive();
  const showSnackbar = useGlobalSnackbar();

  // 定义错误状态
  const [error, setError] = useState<string | null>(null);

  // 加载全部往期
  const handleShowAll = async () => {
    if (showAll) return;
    setLoadingAll(true);
    try {
      const res = await weeklyCardsApi.getAllLimited(500);
      if (res.success) {
        const allCards = (res?.data?.records || []).map(
          (card: WeeklyCard, index: number) => ({
            ...card,
            gradient: getWeeklyCardGradient(card, index),
          })
        );
        setCards(allCards);
        setFilteredCards(allCards);
        setShowAll(true);
      }
    } catch (e) {
      showSnackbar.error('加载往期失败');
    } finally {
      setLoadingAll(false);
    }
  };

  // 加载卡片数据
  useEffect(() => {
    const loadWeeklyCards = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams(location.search);
        const episodeParam = episodeFromPath || params.get('episode') || '';

        let res: any;
        if (episodeParam) {
          res = await weeklyCardsApi.getByEpisode(episodeParam);
        } else {
          // 默认只加载最新一期
          res = await weeklyCardsApi.getLatest();
        }

        if (!res.success) {
          setError('获取周刊卡片数据失败');
          showSnackbar.error('获取周刊卡片数据失败');
          return;
        }

        const allCards = res?.data?.records || [];

        // 规范化卡片数据格式
        const normalizedCards = allCards.map(
          (card: WeeklyCard, index: number) => ({
            ...card,
            gradient: getWeeklyCardGradient(card, index),
          })
        );

        setCards(normalizedCards);
        setFilteredCards(normalizedCards);
      } catch (error: any) {
        setError('加载数据失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    loadWeeklyCards();
  }, [location.search, episodeFromPath]);

  // 输入去抖
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // 过滤卡片（关键字）
  useEffect(() => {
    setAllPage(1); // 搜索变化时重置分页

    if (!debouncedQuery) {
      setFilteredCards(cards);
      return;
    }

    const q = debouncedQuery.toLowerCase();
    const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '');

    const match = (card: WeeklyCardItem) => {
      const title = (card.title || '').toLowerCase();
      const quote = (card.quote || '').toLowerCase();
      const detailText = stripHtml(card.detail || '').toLowerCase();
      const name = (card.name || '').toLowerCase();
      return (
        title.includes(q) ||
        quote.includes(q) ||
        detailText.includes(q) ||
        name.includes(q)
      );
    };

    setFilteredCards(cards.filter(match));
  }, [cards, debouncedQuery]);

  const escapeRegExp = (str: string) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const renderHighlighted = (text = '', query: string) => {
    const q = query.trim();
    if (!q || q.length < 2) return text;
    const reg = new RegExp(`(${escapeRegExp(q)})`, 'gi');
    const parts = text.split(reg);
    return parts.map((part, i) =>
      reg.test(part) ? (
        <mark key={i}>{part}</mark>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    );
  };

  const handleDownloadCard = async (card_id: string) => {
    let wrapper: HTMLDivElement | null = null;

    try {
      const original = document.getElementById(`card-${card_id}`);
      if (!original) return;

      const card = cards.find((c) => c.id === card_id);
      if (!card) return;

      wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-10000px';
      wrapper.style.top = '0';
      wrapper.style.width = `${EXPORT_WIDTH}px`;
      wrapper.style.height = 'auto';
      wrapper.style.zIndex = '-1';
      wrapper.style.pointerEvents = 'none';

      const clone = original.cloneNode(true) as HTMLElement;
      clone.style.width = `${EXPORT_WIDTH}px`;
      clone.style.height = 'auto';
      clone.style.minHeight = '0';
      clone.style.boxSizing = 'border-box';
      clone.style.padding = `${EXPORT_PADDING}px`;
      clone.style.transform = 'none';
      clone.style.boxShadow = 'none';
      clone.style.overflow = 'hidden';
      clone.style.display = 'flex';
      clone.style.flexDirection = 'column';
      clone.style.position = 'relative';

      const dlBtn = clone.querySelector('.download-btn') as HTMLElement | null;
      if (dlBtn) dlBtn.style.display = 'none';

      const imgs = Array.from(clone.getElementsByTagName('img'));
      imgs.forEach((img) => {
        img.style.maxHeight = 'none';
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.objectFit = 'contain';
      });

      normalizeExportText(clone);

      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      // 在右下角添加二维码
      const qrCodeLoaded = await loadQRCodeLibrary();
      if (
        qrCodeLoaded &&
        typeof (window as any).QRCode.toCanvas === 'function'
      ) {
        const qrContainer = document.createElement('div');
        qrContainer.style.position = 'absolute';
        qrContainer.style.right = '36px';
        qrContainer.style.bottom = '36px';
        qrContainer.style.width = `${EXPORT_QR_SIZE}px`;
        qrContainer.style.height = `${EXPORT_QR_SIZE}px`;
        qrContainer.style.padding = '6px';
        qrContainer.style.borderRadius = '12px';
        qrContainer.style.boxSizing = 'border-box';

        const qrCanvas = document.createElement('canvas');
        qrCanvas.width = EXPORT_QR_SIZE * 2;
        qrCanvas.height = EXPORT_QR_SIZE * 2;

        const computedStyle = window.getComputedStyle(original);
        const qrColor = computedStyle.color || '#333333';
        const qrPanelStyles = getQrPanelStyles(qrColor);
        qrContainer.style.backgroundColor = qrPanelStyles.backgroundColor;
        qrContainer.style.border = `1px solid ${qrPanelStyles.borderColor}`;
        qrContainer.style.boxShadow = '0 10px 28px rgba(15, 23, 42, 0.12)';

        const episodeStr = card?.episode ? card.episode.toLowerCase() : '';
        const targetUrl = episodeStr
          ? `${window.location.origin}/weekly-cards/${episodeStr}`
          : window.location.href;

        await (window as any).QRCode.toCanvas(qrCanvas, targetUrl, {
          width: EXPORT_QR_SIZE * 2,
          height: EXPORT_QR_SIZE * 2,
          margin: 0,
          colorDark: qrColor,
          colorLight: 'transparent',
          correctLevel: (window as any).QRCode.CorrectLevel?.M || 0,
        });

        qrCanvas.style.width = '100%';
        qrCanvas.style.height = '100%';
        qrContainer.appendChild(qrCanvas);
        clone.appendChild(qrContainer);
      }

      const measuredHeight = await fitExportTypography(
        clone,
        getInitialExportTypography(card)
      );
      const finalExportHeight = getFinalExportHeight(measuredHeight);

      clone.style.height = `${finalExportHeight}px`;
      clone.style.minHeight = `${finalExportHeight}px`;
      wrapper.style.height = `${finalExportHeight}px`;
      await waitForLayout();

      const canvas = await html2canvas(clone, {
        backgroundColor: null,
        scale: 1.5,
        useCORS: true,
        logging: false,
        width: EXPORT_WIDTH,
        height: finalExportHeight,
        windowWidth: EXPORT_WIDTH,
        windowHeight: finalExportHeight,
      });

      const link = document.createElement('a');
      link.download = `weekly-card-${card_id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      if (error instanceof Error) {
        alert(`下载失败: ${error.message}`);
      }
    } finally {
      if (wrapper?.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    }
  };

  // 往期分页：先切出当页的10条，再做年份/期数分组
  const pagedCards = showAll
    ? filteredCards.slice(
        (allPage - 1) * ALL_PAGE_SIZE,
        allPage * ALL_PAGE_SIZE
      )
    : filteredCards;
  const allTotalPages = Math.ceil(filteredCards.length / ALL_PAGE_SIZE);

  // 按「年份 + 期数」两级分组
  // 结构：{ year: { episode: cards[] } }
  const groupedByYear = pagedCards.reduce(
    (acc: Record<string, Record<string, WeeklyCardItem[]>>, card) => {
      const year = getBeijingYear(card.created);
      const ep = card.episode;
      if (!acc[year]) acc[year] = {};
      if (!acc[year][ep]) acc[year][ep] = [];
      acc[year][ep].push(card);
      return acc;
    },
    {}
  );

  // 年份倒序
  const sortedYears = Object.keys(groupedByYear).sort(
    (a, b) => Number(b) - Number(a)
  );

  // 每年内期数倒序（按集数数字）
  const sortedEpisodesForYear = (year: string): string[] =>
    Object.keys(groupedByYear[year]).sort(
      (a, b) =>
        parseInt(b.replace(/\D/g, '') || '0') -
        parseInt(a.replace(/\D/g, '') || '0')
    );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: 8,
        background: '#fff9f0',
      }}
    >
      <Container maxWidth="lg">
        <Paper
          elevation={1}
          sx={{
            p: 3,
            mb: 6,
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <TextField
            fullWidth
            sx={{ width: '100%' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="输入标题/引语/正文/作者，支持模糊搜索"
            size={isMobile ? 'small' : 'medium'}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchQuery('');
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {searchQuery && (
                    <IconButton
                      aria-label="清空"
                      onClick={() => setSearchQuery('')}
                      edge="end"
                    >
                      ✕
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            }}
          />
        </Paper>

        {error && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 4,
              borderRadius: '12px',
              color: '#b91c1c',
              backgroundColor: '#fee2e2',
            }}
          >
            {error}
          </Paper>
        )}

        {/* 卡片容器 */}
        {loading ? (
          <Loading size={40} />
        ) : sortedYears.length === 0 ? (
          <Empty message="暂无卡片数据" />
        ) : (
          <Grid container spacing={4}>
            {sortedYears.map((year) => (
              <Grid key={year} size={{ xs: 12 }}>
                {/* 年份标题：仅 showAll 时显示 */}
                {showAll && (
                  <Typography
                    variant="h3"
                    component="h2"
                    sx={{ fontWeight: 'bold', mb: 3, color: '#4a4a6a' }}
                  >
                    {year} 年
                  </Typography>
                )}

                {sortedEpisodesForYear(year).map((episode) => (
                  <Box key={episode} sx={{ mb: 6 }}>
                    <Typography
                      variant="h5"
                      component="h3"
                      id={`episode-${year}-${episode.toLowerCase()}`}
                      sx={{
                        fontWeight: 'bold',
                        paddingBottom: '0.75rem',
                        marginBottom: '1.5rem',
                        color: '#667eea',
                        borderBottom: '1px solid #667eea',
                      }}
                    >
                      {episode}
                    </Typography>

                    <Grid
                      container
                      spacing={3}
                      id={`episode-container-${year}-${episode.toLowerCase()}`}
                    >
                      {groupedByYear[year][episode].map((card) => {
                        const cardGradientClass =
                          card.gradient || 'card-gradient-1';
                        const fontColor =
                          getFontColorForGradient(cardGradientClass);
                        return (
                          <Grid key={card.id} size={{ xs: 12, md: 6 }}>
                            <Box
                              sx={{
                                position: 'relative',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                              }}
                            >
                              <Paper
                                elevation={1}
                                id={`card-${card.id}`}
                                className={cardGradientClass}
                                sx={{
                                  height: '100%',
                                  borderRadius: '12px',
                                  overflow: 'hidden',
                                  p: 4,
                                  color: fontColor,
                                  position: 'relative',
                                  backdropFilter: 'blur(10px)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                }}
                              >
                                <Box className="card-export-content">
                                  <Typography
                                    className="card-title"
                                    variant="h5"
                                    component="h3"
                                    sx={{
                                      fontWeight: 'bold',
                                      mb: 2,
                                      color: fontColor,
                                    }}
                                  >
                                    {renderHighlighted(
                                      card.title,
                                      debouncedQuery
                                    )}
                                  </Typography>

                                  <Box
                                    className="card-quote-box"
                                    sx={{
                                      backgroundColor: `${fontColor}10`,
                                      p: 2,
                                      borderRadius: '8px',
                                      mb: 3,
                                      fontStyle: 'italic',
                                      position: 'relative',
                                      pl: 4,
                                      '&::before': {
                                        content: '"“"',
                                        position: 'absolute',
                                        left: 8,
                                        top: -10,
                                        fontSize: '2.2rem',
                                        lineHeight: 1,
                                        color: fontColor,
                                        opacity: 0.2,
                                      },
                                    }}
                                  >
                                    <Typography
                                      className="card-quote"
                                      variant="body1"
                                      sx={{
                                        color: fontColor,
                                        fontSize: '16px',
                                        lineHeight: '26px',
                                      }}
                                    >
                                      {card.quote
                                        ?.split('\n')
                                        .map((line, i) => (
                                          <React.Fragment key={i}>
                                            {line}
                                            {i !==
                                              card.quote.split('\n').length -
                                                1 && <br />}
                                          </React.Fragment>
                                        ))}
                                    </Typography>
                                  </Box>

                                  <Box
                                    className="card-detail-box"
                                    sx={{
                                      fontSize: '16px',
                                      lineHeight: '26px', // 使用具体像素值解决 html2canvas 换行重叠 bug
                                      mb: 3,
                                      flexGrow: 1,
                                      wordBreak: 'break-word',
                                      '& p': {
                                        margin: '0 0 16px 0',
                                        lineHeight: '26px',
                                      },
                                      '& br': {
                                        display: 'block',
                                        content: '""',
                                        marginTop: '8px',
                                        lineHeight: '26px',
                                      },
                                    }}
                                  >
                                    <div
                                      dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(
                                          card.detail
                                            ? marked
                                                .parse(card.detail)
                                                .toString()
                                            : ''
                                        ),
                                      }}
                                    />
                                  </Box>
                                </Box>

                                <Box
                                  className="card-footer-box"
                                  sx={{
                                    mt: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: 0.5,
                                  }}
                                >
                                  <Typography
                                    className="card-footer-primary"
                                    variant="caption"
                                    sx={{
                                      color: fontColor,
                                      fontWeight: 600,
                                      opacity: 0.9,
                                    }}
                                  >
                                    {card.name ? (
                                      <>星友「{card.name}」的分享</>
                                    ) : (
                                      '星友分享'
                                    )}
                                  </Typography>
                                  <Typography
                                    className="card-footer-meta"
                                    variant="caption"
                                    sx={{ color: fontColor, opacity: 0.72 }}
                                  >
                                    启发星球 {card.episode} ·{' '}
                                    {formatBeijingDate(card.created)}
                                  </Typography>
                                </Box>
                              </Paper>

                              <Button
                                className="download-btn"
                                onClick={() => handleDownloadCard(card.id)}
                                title="下载卡片"
                                sx={{
                                  position: 'absolute',
                                  bottom: 10,
                                  right: 10,
                                  backgroundColor: '#667eea',
                                  '&:hover': {
                                    backgroundColor: '#5a67d8',
                                    opacity: '1',
                                  },
                                  minWidth: 'auto',
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  color: 'white',
                                  opacity: '0.5',
                                  p: 0,
                                }}
                              >
                                <DownloadIcon fontSize="small" />
                              </Button>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                ))}
              </Grid>
            ))}
          </Grid>
        )}

        {/* 查看往期 / 分页 */}
        {!loading && !showAll && sortedYears.length > 0 && (
          <Box sx={{ mt: 6, textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={handleShowAll}
              disabled={loadingAll}
              sx={{ color: '#667eea', borderColor: '#667eea', px: 4 }}
            >
              {loadingAll ? '加载中…' : '查看往期'}
            </Button>
          </Box>
        )}
        {!loading && showAll && allTotalPages > 1 && (
          <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={allTotalPages}
              page={allPage}
              onChange={(_, v) => {
                setAllPage(v);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              color="primary"
              shape="rounded"
            />
          </Box>
        )}

        {/* 返回首页链接 */}
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Button
            variant="contained"
            component={Link}
            to="/"
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: '#667eea',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
              py: 1.2,
              px: 4,
            }}
          >
            返回首页
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default WeeklyCards;
