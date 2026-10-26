import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, CircularProgress } from '@mui/material';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  episodeResponsesApi,
  episodesApi,
  weeklyCardsApi,
} from '@/netlify/config';
import { EpisodeCardContext } from '@/netlify/functions/episodes';
import { EpisodeResponse } from '@/netlify/functions/episodeResponses';
import { EpisodeSummary, WeeklyCard } from '@/netlify/services/weeklyCards';
import { saveImageDataUrl } from '@/utils/share';
import { getSourceSpeaker } from '@/hooks/useQuoteSelection';
import QuoteResponseBar from '@/components/QuoteResponseBar';
import EpisodeRoundtable from '@/components/EpisodeRoundtable';
import cardStyles from '../card/EpisodeCardCreate/episodeCardCreate.module.css';
import styles from './episodeHub.module.css';

const INSPIRE_PLANET_MEETUP_ID = 39;

const getDetailParagraphs = (detail = ''): string[] =>
  detail
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

const IGNORED_SPEAKER_LABELS = new Set(['现场分享', '星友分享', '匿名']);

const renderKeyPointText = (point: string) => {
  const colonIdx = point.indexOf('：');
  if (colonIdx > 0 && colonIdx <= 18) {
    return (
      <>
        <strong>{point.slice(0, colonIdx + 1)}</strong>
        {point.slice(colonIdx + 1)}
      </>
    );
  }
  return point;
};

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
  const navigate = useNavigate();
  const readingRef = useRef<HTMLElement>(null);
  const meetupId = INSPIRE_PLANET_MEETUP_ID;
  const episodeNumber = Number(params.episode);
  const routeYear = params.year ? Number(params.year) : null;
  const [episode, setEpisode] = useState<EpisodeCardContext | null>(null);
  const [responses, setResponses] = useState<EpisodeResponse[]>([]);
  const [weeklyCards, setWeeklyCards] = useState<WeeklyCard[]>([]);
  const [episodeSummary, setEpisodeSummary] = useState<EpisodeSummary | null>(
    null
  );
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

      setIsLoading(true);
      setError(null);

      try {
        const [episodeResult, responsesResult, weeklyResult] =
          await Promise.all([
            episodesApi.getByMeetupEpisode(meetupId, episodeNumber),
            episodeResponsesApi.getByEpisode(meetupId, episodeNumber),
            weeklyCardsApi.getByEpisode(
              String(episodeNumber),
              routeYear || undefined
            ),
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
        } else {
          setResponses([]);
        }
        if (weeklyResult.success) {
          setWeeklyCards(weeklyResult.data?.records || []);
          setEpisodeSummary(weeklyResult.data?.summary || null);
        } else {
          setWeeklyCards([]);
          setEpisodeSummary(null);
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
    if (isLoading) return;
    let frame = 0;
    const revealAnchor = () => {
      const hash = window.location.hash;
      if (
        !['#responses', '#roundtable', '#weekly-heading'].includes(hash) &&
        !/^#topic-\d+$/.test(hash)
      )
        return;
      frame = window.requestAnimationFrame(() => {
        const target = document.getElementById(hash.slice(1));
        if (/^#topic-\d+$/.test(hash)) {
          target?.querySelector('details')?.setAttribute('open', '');
        }
        target?.scrollIntoView({ block: 'start' });
      });
    };
    revealAnchor();
    window.addEventListener('hashchange', revealAnchor);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', revealAnchor);
    };
  }, [isLoading, episodeNumber, routeYear]);

  const respondToQuote = (quote: string, speaker = '', label = '') => {
    navigate(createUrl, {
      state: {
        quote,
        quoteSpeaker: getSourceSpeaker(speaker),
        quoteSourceLabel: label,
      },
    });
  };

  const episodeDate =
    episode?.date ||
    episodeSummary?.date ||
    (weeklyCards[0]?.created ? weeklyCards[0].created.slice(0, 10) : '');
  const episodeYear = getEpisodeYear(episodeDate) ?? routeYear;
  const episodeLabel = `${episodeYear ? `${episodeYear} · ` : ''}EP${episode?.episode_number}`;
  const prevEpisodeHref =
    episodeNumber > 1
      ? `/episodes/${episodeYear ? `${episodeYear}/` : ''}${episodeNumber - 1}`
      : null;
  const nextEpisodeHref = `/episodes/${episodeYear ? `${episodeYear}/` : ''}${episodeNumber + 1}`;
  const hasStructuredSummary = Boolean(episodeSummary?.topics?.length);
  const weeklyIssueHref = `/weekly-cards/${episodeNumber}${episodeYear ? `?year=${episodeYear}` : ''}`;

  const speakerNames = useMemo(() => {
    const rawSource =
      weeklyCards.length > 0
        ? weeklyCards.map((c) => c.name)
        : episodeSummary?.topics?.map((t) => t.speaker) || [];
    const names = rawSource
      .flatMap((s) => (s ? s.split(/[&、/]/) : []))
      .map((s) => s.replace(/（.*?）|\(.*?\)/g, '').trim())
      .filter((s) => s && !IGNORED_SPEAKER_LABELS.has(s));
    return Array.from(new Set(names));
  }, [episodeSummary, weeklyCards]);

  const exportingResponse = responses.find(
    (response) => response.id === exportingResponseId
  );
  const shareUrl = `${window.location.origin}/episodes/${episodeYear ? `${episodeYear}/` : ''}${episodeNumber}`;

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
      const mainStyle = window.getComputedStyle(mainContent);
      const availableHeight =
        mainContent.clientHeight -
        parseFloat(mainStyle.paddingTop) -
        parseFloat(mainStyle.paddingBottom);
      while (
        (quote.parentElement?.offsetHeight || 0) > availableHeight &&
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
        <div className={styles.heroInner}>
          <div className={styles.heroTopBar}>
            <div className={styles.heroMeta}>
              <span className={styles.episodeBadge}>
                启发星球 · {episodeLabel}
              </span>
              {episodeDate && (
                <time dateTime={episodeDate}>
                  {formatEpisodeDate(episodeDate)}
                </time>
              )}
              {speakerNames.length > 0 && (
                <span className={styles.speakerSummary}>
                  分享者：{speakerNames.join(' · ')}
                </span>
              )}
            </div>
            <nav className={styles.episodeSwitchNav} aria-label="期数切换">
              {prevEpisodeHref && (
                <Link to={prevEpisodeHref} className={styles.switchLink}>
                  ← EP{String(episodeNumber - 1).padStart(2, '0')}
                </Link>
              )}
              <Link to={nextEpisodeHref} className={styles.switchLink}>
                EP{String(episodeNumber + 1).padStart(2, '0')} →
              </Link>
            </nav>
          </div>

          <h1>{episodeSummary?.title || `启发星球 ${episodeLabel}`}</h1>

          <p className={styles.intro}>
            {episodeSummary?.overview ||
              (weeklyCards.length > 0
                ? `本期共整理了 ${weeklyCards.length} 段来自现场真实分享的记录，涵盖过去一周的阅读、观察与实践。`
                : '大家从过去一周带来各自的碎片输入、启发与思考。这里收集本期分享，以及会议结束后仍想留下的话。')}
          </p>
        </div>
      </header>

      <section
        ref={readingRef}
        className={styles.section}
        aria-labelledby="weekly-heading"
      >
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="weekly-heading">这一期聊了什么</h2>
          </div>
          {weeklyCards.length > 0 && (
            <Link to={weeklyIssueHref} className={styles.cardCollectionLink}>
              本期金句卡片 ↗
            </Link>
          )}
        </div>

        {(hasStructuredSummary || weeklyCards.length > 0) && (
          <p className={styles.readingHint}>
            展开感兴趣的话题；选中文字，可以带着引用回应。
          </p>
        )}
        {hasStructuredSummary && episodeSummary ? (
          <div className={styles.summaryContainer}>
            <div className={styles.topicList}>
              {episodeSummary.topics.map((topic, idx) => (
                <article
                  id={`topic-${idx + 1}`}
                  data-response-source
                  data-response-speaker={getSourceSpeaker(topic.speaker)}
                  className={styles.topicCard}
                  key={`${routeYear}/${episodeNumber}/${idx}`}
                >
                  <div className={styles.topicHeader}>
                    <span className={styles.topicSpeaker}>
                      {topic.speaker
                        ? `分享者 · ${topic.speaker}`
                        : `话题 ${String(idx + 1).padStart(2, '0')}`}
                    </span>
                    <span className={styles.topicIndex}>
                      TOPIC {String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <h3>{topic.title}</h3>

                  {topic.quote && <blockquote>{topic.quote}</blockquote>}

                  {(topic.context || topic.summary) && (
                    <p className={styles.topicPreview}>
                      {topic.context || topic.summary}
                    </p>
                  )}
                  {(topic.context ||
                    topic.summary ||
                    topic.keyPoints?.length ||
                    topic.discussion) && (
                    <details className={styles.topicDetails}>
                      <summary>
                        <span className={styles.expandLabel}>
                          展开分享与讨论
                        </span>
                        <span className={styles.collapseLabel}>收起详情</span>
                      </summary>
                      {(topic.context || topic.summary) && (
                        <div className={styles.topicContextBox}>
                          <span className={styles.blockLabel}>分享缘起</span>
                          <p className={styles.topicBody}>
                            {topic.context || topic.summary}
                          </p>
                        </div>
                      )}

                      {topic.keyPoints && topic.keyPoints.length > 0 && (
                        <div className={styles.topicKeyPointsBox}>
                          <span className={styles.blockLabel}>关键脉络</span>
                          <ol className={styles.keyPointsList}>
                            {topic.keyPoints.map((point, pIdx) => (
                              <li key={pIdx}>{renderKeyPointText(point)}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {topic.discussion && (
                        <div
                          data-response-source
                          data-response-label="现场讨论"
                          className={styles.topicDiscussion}
                        >
                          <strong>现场追问与碰撞</strong>
                          <p>{topic.discussion}</p>
                        </div>
                      )}
                    </details>
                  )}
                </article>
              ))}
            </div>

            {episodeSummary.highlights &&
              episodeSummary.highlights.length > 0 && (
                <details
                  data-response-source
                  data-response-label="现场片段"
                  className={`${styles.highlightsBox} ${styles.topicDetails}`}
                  key={`${routeYear}/${episodeNumber}/highlights`}
                >
                  <summary>现场还聊到</summary>
                  <ul>
                    {episodeSummary.highlights.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </details>
              )}
          </div>
        ) : weeklyCards.length > 0 ? (
          <div className={styles.weeklyGrid}>
            {weeklyCards.map((card, idx) => {
              const paragraphs = getDetailParagraphs(card.detail);
              return (
                <article
                  data-response-source
                  data-response-speaker={getSourceSpeaker(card.name)}
                  className={styles.weeklyCard}
                  key={`${routeYear}/${episodeNumber}/${card.id}`}
                >
                  <div className={styles.topicHeader}>
                    <span className={styles.topicSpeaker}>
                      {card.name ? `分享者 · ${card.name}` : '星友分享'}
                    </span>
                    <span className={styles.topicIndex}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3>{card.title}</h3>
                  {card.quote && <blockquote>{card.quote}</blockquote>}
                  {paragraphs.length > 0 && (
                    <>
                      <p className={styles.topicPreview}>{paragraphs[0]}</p>
                      <details className={styles.topicDetails}>
                        <summary>
                          <span className={styles.expandLabel}>
                            展开分享详情
                          </span>
                          <span className={styles.collapseLabel}>收起详情</span>
                        </summary>
                        <div className={styles.cardDetailBody}>
                          {paragraphs.map((para, pIdx) => (
                            <p key={pIdx}>{para}</p>
                          ))}
                        </div>
                      </details>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.pendingCard}>
            <strong>本期分享纪要正在整理中</strong>
            <p>
              刚参加完会议？不用等纪要，可以先留下当时的感受、收获，或接下来想试试的事。纪要整理好后会在这里发布。
            </p>
          </div>
        )}
      </section>

      <EpisodeRoundtable episodeNumber={episodeNumber} year={episodeYear} />

      <section
        className={`${styles.section} ${styles.responsesSection}`}
        id="responses"
        aria-labelledby="responses-heading"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p>本期回应墙 · {responses.length} 条</p>
            <h2 id="responses-heading">大家的回应</h2>
          </div>
          <Link to={createUrl} className={styles.primaryAction}>
            留下回应
          </Link>
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
          </div>
        )}
      </section>

      <QuoteResponseBar
        container={readingRef}
        resetKey={`${routeYear}/${episodeNumber}`}
        onRespond={(quote) =>
          respondToQuote(quote.text, quote.speaker, quote.label)
        }
      />

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
              <span>扫码查看本期</span>
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
