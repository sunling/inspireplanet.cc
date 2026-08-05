import React, { useEffect, useMemo, useState } from 'react';
import { Alert, CircularProgress } from '@mui/material';
import { Link, useParams } from 'react-router-dom';

import {
  episodeResponsesApi,
  episodesApi,
  weeklyCardsApi,
} from '@/netlify/config';
import { EpisodeCardContext } from '@/netlify/functions/episodes';
import { EpisodeResponse } from '@/netlify/functions/episodeResponses';
import { WeeklyCard } from '@/netlify/services/weeklyCards';
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

const EpisodeHub: React.FC = () => {
  const params = useParams<{ episode: string }>();
  const meetupId = INSPIRE_PLANET_MEETUP_ID;
  const episodeNumber = Number(params.episode);
  const [episode, setEpisode] = useState<EpisodeCardContext | null>(null);
  const [responses, setResponses] = useState<EpisodeResponse[]>([]);
  const [weeklyCards, setWeeklyCards] = useState<WeeklyCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createUrl = useMemo(
    () => `/episodes/${episodeNumber}/respond`,
    [episodeNumber]
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

        setEpisode(episodeResult.data.episode);
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
  }, [meetupId, episodeNumber]);

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
        <h1>启发星球 EP{episode.episode_number}</h1>
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

        {responses.length > 0 ? (
          <div className={styles.responseGrid}>
            {responses.map((response, index) => (
              <article className={styles.responseCard} key={response.id}>
                <span className={styles.responseNumber}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <blockquote>{response.content}</blockquote>
                <footer>
                  <strong>{response.author}</strong>
                  <time dateTime={response.created_at}>
                    回应于{' '}
                    {new Date(response.created_at).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
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
    </main>
  );
};

export default EpisodeHub;
