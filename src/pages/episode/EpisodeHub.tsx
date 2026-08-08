import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, CircularProgress } from '@mui/material';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useParams } from 'react-router-dom';

import {
  episodeResponsesApi,
  episodesApi,
  weeklyCardsApi,
} from '@/netlify/config';
import { EpisodeCardContext } from '@/netlify/functions/episodes';
import { EpisodeResponse } from '@/netlify/functions/episodeResponses';
import { WeeklyCard } from '@/netlify/services/weeklyCards';
import { saveImageDataUrl } from '@/utils/share';
import cardStyles from '../card/EpisodeCardCreate/episodeCardCreate.module.css';
import styles from './episodeHub.module.css';

const INSPIRE_PLANET_MEETUP_ID = 39;

const getDetailPreview = (detail = '') =>
  detail
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatEpisodeDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const getEpisodeYear = (date: string) =>
  date ? new Date(`${date}T00:00:00`).getFullYear() : null;

const EpisodeHub: React.FC = () => {
  const params = useParams<{ year?: string; episode: string }>();
  const meetupId = INSPIRE_PLANET_MEETUP_ID;
  const episodeNumber = Number(params.episode);
  const routeYear = params.year ? Number(params.year) : null;
  const [episode, setEpisode] = useState<EpisodeCardContext | null>(null);
  const [responses, setResponses] = useState<EpisodeResponse[]>([]);
  const [weeklyCards, setWeeklyCards] = useState<WeeklyCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exportingResponseId, setExportingResponseId] = useState<number | null>(
    null
  );
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharePreview, setSharePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const exportCardRef = useRef<HTMLDivElement>(null);
  const exportMainRef = useRef<HTMLDivElement>(null);
  const exportQuoteRef = useRef<HTMLDivElement>(null);

  const createUrl = useMemo(
    () =>
      `/episodes/${routeYear ? `${routeYear}/` : ''}${episodeNumber}/respond`,
    [episodeNumber, routeYear]
  );

  useEffect(() => {
    const loadEpisodeHub = async () => {
      if (!Number.isInteger(meetupId) || !Number.isInteger(episodeNumber)) {
        setError('缺少有效的活动或期数信息');
        setIsLoading(false);
        return;
      }

      try {
        const [episodeResult, responsesResult, weeklyResult] =
          await Promise.all([
            episodesApi.getByMeetupEpisode(meetupId, episodeNumber),
            episodeResponsesApi.getByEpisode(meetupId, episodeNumber),
            weeklyCardsApi.getByEpisode(String(episodeNumber)),
          ]);

        if (!episodeResult.success || !episodeResult.data?.episode) {
          throw new Error(episodeResult.error || '无法读取本期活动');
        }

        const loadedEpisode = episodeResult.data.episode;
        const loadedYear = getEpisodeYear(loadedEpisode.date);
        if (routeYear && loadedYear && routeYear !== loadedYear) {
          throw new Error(`${routeYear} 年没有找到 EP${episodeNumber}`);
        }
        setEpisode(loadedEpisode);
        if (responsesResult.success) {
          setResponses(responsesResult.data?.responses || []);
        }
        if (weeklyResult.success) {
          setWeeklyCards(weeklyResult.data?.records || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '无法读取本期内容');
      } finally {
        setIsLoading(false);
      }
    };

    loadEpisodeHub();
  }, [meetupId, episodeNumber, routeYear]);

  useEffect(() => {
    if (!isLoading && window.location.hash === '#responses') {
      window.requestAnimationFrame(() => {
        document.getElementById('responses')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    }
  }, [isLoading]);

  const episodeYear = getEpisodeYear(episode?.date || '');
  const episodeLabel = `${episodeYear ? `${episodeYear} · ` : ''}EP${episode?.episode_number}`;
  const exportingResponse = responses.find(
    (response) => response.id === exportingResponseId
  );
  const shareUrl = `${window.location.origin}${createUrl}`;

  const handleShareResponse = async (response: EpisodeResponse) => {
    setExportingResponseId(response.id);
    setShareError(null);
    try {
      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => resolve())
        )
      );
      const card = exportCardRef.current;
      const mainContent = exportMainRef.current;
      const quote = exportQuoteRef.current;
      if (!card || !mainContent || !quote) {
        throw new Error('分享卡片尚未准备好');
      }

      let fontSize = Number.parseFloat(quote.style.fontSize);
      while (
        mainContent.scrollHeight > mainContent.clientHeight &&
        fontSize > 10
      ) {
        fontSize -= 1;
        quote.style.fontSize = `${fontSize}px`;
      }

      const canvas = await html2canvas(card, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });
      const imageDataUrl = canvas.toDataURL('image/png');
      if (/MicroMessenger/i.test(navigator.userAgent)) {
        setSharePreview(imageDataUrl);
      } else {
        saveImageDataUrl(
          imageDataUrl,
          `inspire-planet-${episodeYear || 'episode'}-ep${episodeNumber}-response-${response.id}.png`
        );
      }
    } catch {
      setShareError('分享图片生成失败，请稍后再试');
    } finally {
      setExportingResponseId(null);
    }
  };

  if (isLoading) {
    return (
      <main className={styles.state}>
        <CircularProgress />
      </main>
    );
  }

  if (error || !episode) {
    return (
      <main className={styles.state}>
        <Alert severity="error">{error || '本期内容不存在'}</Alert>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>每周线上分享</p>
        <h1>启发星球 {episodeLabel}</h1>
        {episode.date && (
          <time dateTime={episode.date}>{formatEpisodeDate(episode.date)}</time>
        )}
        <p className={styles.intro}>
          大家从过去一周带来各自的碎片输入、启发与思考。这里收集本期周刊，以及分享结束后仍想留下的话。
        </p>
        <div className={styles.heroActions}>
          <Link to={createUrl} className={styles.primaryAction}>
            写下我的一句
          </Link>
          <a href="#responses" className={styles.secondaryAction}>
            看看大家的回应
          </a>
        </div>
      </header>

      <section className={styles.section} aria-labelledby="weekly-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p>本期周刊</p>
            <h2 id="weekly-heading">这一期，我们分享了什么</h2>
          </div>
          {weeklyCards.length > 0 && (
            <Link to={`/weekly-cards/${episodeNumber}`}>阅读完整周刊</Link>
          )}
        </div>

        {weeklyCards.length > 0 ? (
          <div className={styles.weeklyGrid}>
            {weeklyCards.slice(0, 3).map((card) => (
              <article className={styles.weeklyCard} key={card.id}>
                <span>分享者 · {card.name}</span>
                <h3>{card.title}</h3>
                <blockquote>{card.quote}</blockquote>
                {card.detail && <p>{getDetailPreview(card.detail)}</p>}
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.pendingCard}>
            <strong>本期周刊正在整理中</strong>
            <p>你可以先写下自己的那一句。周刊发布后，会自动出现在这里。</p>
          </div>
        )}
      </section>

      <section
        className={`${styles.section} ${styles.responsesSection}`}
        id="responses"
        aria-labelledby="responses-heading"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p>本期回应墙 · {responses.length} 条</p>
            <h2 id="responses-heading">从这些片段继续生长</h2>
          </div>
          <Link to={createUrl}>我也写一句</Link>
        </div>

        {shareError && <Alert severity="warning">{shareError}</Alert>}

        {responses.length > 0 ? (
          <div className={styles.responseGrid}>
            {responses.map((response, index) => (
              <article
                className={styles.responseCard}
                id={`response-${response.id}`}
                key={response.id}
              >
                <span className={styles.responseNumber}>
                  {episodeLabel} · {String(index + 1).padStart(2, '0')}
                </span>
                <blockquote>{response.content}</blockquote>
                <footer>
                  <div>
                    <strong>{response.author}</strong>
                    <time dateTime={response.created_at}>
                      回应于{' '}
                      {new Date(response.created_at).toLocaleDateString(
                        'zh-CN',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )}
                    </time>
                  </div>
                  <button
                    type="button"
                    className={styles.shareResponse}
                    onClick={() => handleShareResponse(response)}
                    disabled={exportingResponseId !== null}
                    data-html2canvas-ignore="true"
                    aria-label={`分享${response.author}的回应`}
                  >
                    {exportingResponseId === response.id
                      ? '生成中…'
                      : '分享回应'}
                  </button>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyWall}>
            <span>✦</span>
            <h3>这里正等着第一句话</h3>
            <p>可以是一句话、一个片段，或刚刚冒出的新想法。</p>
            <Link to={createUrl} className={styles.primaryAction}>
              成为第一个回应的人
            </Link>
          </div>
        )}
      </section>

      {exportingResponse && (
        <div className={styles.exportStage} aria-hidden="true">
          <div
            ref={exportCardRef}
            className={`${cardStyles.card} ${
              Array.from(exportingResponse.content).length > 180
                ? cardStyles.cardLongText
                : ''
            }`}
          >
            <div className={cardStyles.cardContent}>
              <div className={cardStyles.topMeta}>
                <div className={cardStyles.episodeMeta}>
                  <div className={cardStyles.brandChip}>
                    启发星球 {episodeLabel}
                  </div>
                  <div className={cardStyles.episodeDetails}>
                    {episode.date && (
                      <span>分享日期 · {formatEpisodeDate(episode.date)}</span>
                    )}
                    <span>
                      回应日期 ·{' '}
                      {new Date(
                        exportingResponse.created_at
                      ).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <div className={cardStyles.expressionCue}>
                  真实 · 自由 · 不必完整
                </div>
              </div>

              <div ref={exportMainRef} className={cardStyles.mainContent}>
                <div className={cardStyles.textPanel}>
                  <div
                    ref={exportQuoteRef}
                    className={cardStyles.quote}
                    style={{
                      fontSize:
                        Array.from(exportingResponse.content).length > 420
                          ? 13
                          : Array.from(exportingResponse.content).length > 300
                            ? 15
                            : Array.from(exportingResponse.content).length > 180
                              ? 18
                              : Array.from(exportingResponse.content).length >
                                  110
                                ? 24
                                : Array.from(exportingResponse.content).length >
                                    72
                                  ? 31
                                  : 42,
                      lineHeight:
                        Array.from(exportingResponse.content).length > 300
                          ? 1.32
                          : Array.from(exportingResponse.content).length > 180
                            ? 1.4
                            : 1.5,
                    }}
                  >
                    {exportingResponse.content}
                  </div>
                  <div className={cardStyles.byline}>
                    — {exportingResponse.author}
                  </div>
                </div>
              </div>
            </div>

            <div className={cardStyles.qrFloat}>
              <QRCodeSVG value={shareUrl} size={54} bgColor="#ffffff" />
              <span>扫码回应</span>
            </div>
          </div>
        </div>
      )}

      {sharePreview && (
        <div
          className={styles.sharePreviewBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-preview-title"
          onClick={() => setSharePreview(null)}
        >
          <div
            className={styles.sharePreviewDialog}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.sharePreviewHeading}>
              <div>
                <strong id="share-preview-title">分享这张回应卡片</strong>
                <span>长按图片，选择“发送给朋友”或“保存图片”</span>
              </div>
              <button
                type="button"
                onClick={() => setSharePreview(null)}
                aria-label="关闭分享图片"
              >
                ×
              </button>
            </div>
            <img src={sharePreview} alt={`${episodeLabel} 回应分享卡片`} />
            <p>如果没有出现菜单，请长按图片约 1 秒后再试。</p>
          </div>
        </div>
      )}
    </main>
  );
};

export default EpisodeHub;
