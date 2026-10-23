import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';
import { Container } from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
import Empty from '@/components/Empty';
import Loading from '@/components/Loading';
import styles from './home.module.css';
import ErrorCard from '@/components/ErrorCard';
import {
  weeklyCardsApi,
  meetupsApi,
  roundtableQuestionsApi,
} from '../../netlify/config';
import { WeeklyCard } from '../../netlify/services/weeklyCards';
import { Meetup } from '../../netlify/functions/meetup';
import {
  getNextOccurrence,
  toLocalDateStr,
  getEpisodeNumber,
  getLatestActiveEpisode,
} from '../../utils/recurring';
import dayjs from 'dayjs';

interface UpcomingMeetup {
  meetup: Meetup;
  date: dayjs.Dayjs;
  episodeNumber?: number;
  dateStr: string;
}

const MeetupModeLabel: Record<string, string> = {
  online: '线上',
  offline: '线下',
  hybrid: '线上+线下',
  culture: '文化',
  outdoor: '户外',
};

type EntryPoint = {
  eyebrow: string;
  title: string;
  description: string;
  label: string;
  to?: string;
  href?: string;
};

const getDetailPreview = (detail = '') =>
  detail
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getEpisodeNumberFromLabel = (episode = '') =>
  Number(episode.match(/\d+/)?.[0] || 0);

const Home: React.FC = () => {
  const [cards, setCards] = useState<WeeklyCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingMeetups, setUpcomingMeetups] = useState<UpcomingMeetup[]>([]);
  const [activeRecurringEpisode, setActiveRecurringEpisode] = useState<{
    episodeNumber: number;
    year: number;
  } | null>(null);
  const [roundtableQuestionCount, setRoundtableQuestionCount] = useState(0);
  const [showWechatQr, setShowWechatQr] = useState(false);

  // 加载最新卡片数据
  const fetchLatestCards = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await weeklyCardsApi.getLatest();
      console.log('查询最新卡片返回:', response);

      const records = response?.data?.records || [];

      const formattedCards: WeeklyCard[] = records.filter(
        (card: WeeklyCard) => card.title && card.quote
      ); // 过滤无效卡片

      setCards(formattedCards);
      setIsLoading(false);
    } catch (err) {
      setError('加载卡片失败，请稍后重试');
      setIsLoading(false);
    }
  };

  const fetchUpcomingMeetups = async () => {
    try {
      const res = await meetupsApi.getAll({ status: 'active' });
      const meetups: Meetup[] = res.data?.meetups || [];
      const now = dayjs();

      const recurringMeetup =
        meetups.find(
          (m) => Number(m.id) === 39 && m.is_recurring && m.episode_start_date
        ) || meetups.find((m) => m.is_recurring && m.episode_start_date);
      if (recurringMeetup?.episode_start_date) {
        const latestActive = getLatestActiveEpisode(
          recurringMeetup.datetime,
          recurringMeetup.episode_start_date
        );
        if (latestActive) {
          setActiveRecurringEpisode({
            episodeNumber: latestActive.episodeNumber,
            year: latestActive.year,
          });
        }
      }

      const upcoming: UpcomingMeetup[] = meetups
        .map((m) => {
          if (m.is_recurring && m.episode_start_date) {
            const date = getNextOccurrence(m.datetime);
            const epNum = getEpisodeNumber(m.episode_start_date, date);
            return {
              meetup: m,
              date,
              episodeNumber: epNum,
              dateStr: toLocalDateStr(date),
            };
          }
          const date = dayjs(m.datetime);
          return { meetup: m, date, dateStr: toLocalDateStr(date) };
        })
        .filter((u) => u.date.isAfter(now))
        .sort((a, b) => a.date.valueOf() - b.date.valueOf())
        .slice(0, 4);

      setUpcomingMeetups(upcoming);
    } catch {
      // 静默失败，不影响首页其他内容
    }
  };

  const fetchRoundtableQuestionCount = async () => {
    try {
      const response = await roundtableQuestionsApi.listPublic();
      setRoundtableQuestionCount(
        response.data?.questions?.filter((question) =>
          ['open', 'contacted'].includes(question.status)
        ).length || 0
      );
    } catch {
      // 首页数字只是辅助信息，读取失败时不影响主要内容。
    }
  };

  // 初始化和清理
  useEffect(() => {
    fetchLatestCards();
    fetchUpcomingMeetups();
    fetchRoundtableQuestionCount();
  }, []);

  const renderWeeklyCards = () => {
    if (isLoading) {
      return <Loading message="加载卡片中..." size={40} />;
    }

    if (error) {
      return (
        <ErrorCard
          message={error}
          description="请稍后重试或检查网络连接"
          onRetry={fetchLatestCards}
          retryText="重新加载"
        />
      );
    }

    if (cards.length === 0) {
      return (
        <Empty
          message="暂无最新卡片内容"
          description="前往启发周刊查看更多往期内容"
        />
      );
    }

    return (
      <div className={styles['weekly-grid']}>
        {cards.slice(0, 3).map((card) => (
          <article key={card.id} className={styles['weekly-card']}>
            <div className={styles['weekly-meta']}>
              <span>VOL. {card.episode}</span>
              <time dateTime={card.created}>
                {new Date(card.created).toLocaleDateString('zh-CN', {
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </div>
            <h3>{card.title}</h3>
            <blockquote>{card.quote}</blockquote>
            {card.detail && (
              <p className={styles['weekly-detail']}>
                {getDetailPreview(card.detail)}
              </p>
            )}
            <div className={styles['weekly-author']}>分享者 · {card.name}</div>
            <Link
              to={`/episodes/${new Date(card.created).getFullYear()}/${getEpisodeNumberFromLabel(card.episode)}`}
              className={styles['weekly-link']}
            >
              进入本期页面 <ChevronRight fontSize="inherit" />
            </Link>
          </article>
        ))}
      </div>
    );
  };

  const cardEpisodeNumber = getEpisodeNumberFromLabel(cards[0]?.episode);
  const cardEpisodeYear = cards[0]?.created
    ? Number(
        new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          timeZone: 'Asia/Shanghai',
        }).format(new Date(cards[0].created))
      )
    : new Date().getFullYear();

  const useRecurringEpisode =
    activeRecurringEpisode &&
    (activeRecurringEpisode.year > cardEpisodeYear ||
      (activeRecurringEpisode.year === cardEpisodeYear &&
        activeRecurringEpisode.episodeNumber >= cardEpisodeNumber));
  const latestEpisodeNumber = useRecurringEpisode
    ? activeRecurringEpisode.episodeNumber
    : cardEpisodeNumber;
  const latestEpisodeYear = useRecurringEpisode
    ? activeRecurringEpisode.year
    : cardEpisodeYear;
  const latestEpisodeUrl = latestEpisodeNumber
    ? `/episodes/${latestEpisodeYear}/${latestEpisodeNumber}`
    : '/weekly-cards';

  const nextWeeklyMeetup = upcomingMeetups.find(
    ({ meetup }) => Number(meetup.id) === 39
  );
  const entryPoints: EntryPoint[] = [
    {
      eyebrow: '相遇',
      title: '参加每周线上会议',
      description:
        '来听听大家这一周的经历与启发。有想分享的内容，可以在活动详情页报名分享。',
      label: '查看活动，报名参加或分享',
      to: nextWeeklyMeetup
        ? `/meetup-detail?id=${nextWeeklyMeetup.meetup.id}&date=${nextWeeklyMeetup.dateStr}`
        : '/activity-calendar',
    },
    {
      eyebrow: '回顾与回应',
      title: '回看每一期的分享',
      description:
        '没来现场，也可以浏览每期分享、选一段文字回应。刚参加完会议，可以先留下感受和收获。',
      label: latestEpisodeNumber
        ? `进入 ${latestEpisodeYear} · EP${latestEpisodeNumber}`
        : '浏览往期分享',
      to: latestEpisodeUrl,
    },
    {
      eyebrow: '连接',
      title: '加入社群',
      description: '认识愿意真实分享、彼此启发的人。',
      label: '加入微信群',
      to: '/join',
    },
    {
      eyebrow: '圆桌',
      title: '问题圆桌',
      description:
        roundtableQuestionCount > 0
          ? `把没想明白的那一点带来，当前有 ${roundtableQuestionCount} 个场景正在等待展开。`
          : '把没想明白的那一点带来，默认匿名，从具体经历出发彼此照亮。',
      label: '进入问题圆桌',
      to: '/questions',
    },
  ];

  return (
    <div className={styles['home-container']}>
      <Container maxWidth="lg">
        {/* Hero 区域 */}
        <section className={styles['hero-section']}>
          <p className={styles['hero-eyebrow']}>启发星球</p>
          <h1 className={styles['hero-title']}>让具体的经历被听见</h1>
          <p className={styles['hero-desc']}>
            一个线上社群。真实，不评判，相信每个人具体的经历都有力量。
          </p>
        </section>

        {/* 首页主要入口 */}
        <section className={styles['entry-section']}>
          <div className={styles['section-heading']}>
            <p>从这里开始</p>
            <h2>你可以怎样参与启发星球</h2>
          </div>
          <div className={styles['entry-grid']}>
            {entryPoints.map((entry) => {
              const content = (
                <>
                  <span>{entry.eyebrow}</span>
                  <h3>{entry.title}</h3>
                  <p>{entry.description}</p>
                  <strong>
                    {entry.label} <ChevronRight fontSize="inherit" />
                  </strong>
                </>
              );

              return entry.href ? (
                <a
                  key={entry.href}
                  href={entry.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles['entry-card']}
                >
                  {content}
                </a>
              ) : (
                <Link
                  key={entry.to}
                  to={entry.to || '/'}
                  className={styles['entry-card']}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </section>

        {/* 近期活动 */}
        {upcomingMeetups.length > 0 && (
          <section className={styles['activity-section']}>
            <div className={styles['section-heading']}>
              <p>近期相遇</p>
              <h2>接下来，我们会在这里见面</h2>
            </div>
            <div className={styles['activity-list']}>
              {upcomingMeetups.map(({ meetup, date, episodeNumber }) => {
                const detailUrl = meetup.is_recurring
                  ? `/meetup-detail?id=${meetup.id}&date=${toLocalDateStr(date)}`
                  : `/meetup-detail?id=${meetup.id}`;
                return (
                  <Link
                    key={`${meetup.id}-${toLocalDateStr(date)}`}
                    to={detailUrl}
                    className={styles['activity-card']}
                  >
                    <div className={styles['activity-date']}>
                      <strong>{date.format('DD')}</strong>
                      <span>{date.format('MMM')}</span>
                    </div>
                    <div className={styles['activity-content']}>
                      <h3>
                        {meetup.title}
                        {episodeNumber ? ` EP${episodeNumber}` : ''}
                      </h3>
                      <p>
                        {date.format('HH:mm')} ·{' '}
                        {MeetupModeLabel[meetup.mode] ?? meetup.mode}
                      </p>
                    </div>
                    <ChevronRight className={styles['activity-arrow']} />
                  </Link>
                );
              })}
            </div>
            <div className={styles['activity-more']}>
              <Link
                to="/activity-calendar"
                className={styles['view-all-button']}
              >
                查看活动日历 <ChevronRight fontSize="inherit" />
              </Link>
            </div>
          </section>
        )}

        {/* 最新周刊 */}
        <section className={styles['carousel-section']}>
          <div className={styles['section-heading']}>
            <p>本周启发</p>
            <h2>从真实经历里，带走一个新的视角</h2>
          </div>
          <div className={styles['carousel-container']}>
            {renderWeeklyCards()}
          </div>
          <div className={styles['view-all-container']}>
            {latestEpisodeNumber > 0 && (
              <Link
                to={`/episodes/${latestEpisodeYear}/${latestEpisodeNumber}`}
                className={styles['view-all-button']}
              >
                进入本期页面 <ChevronRight fontSize="inherit" />
              </Link>
            )}
            <Link to="/weekly-cards" className={styles['view-all-button']}>
              查看全部往期周刊 <ChevronRight fontSize="inherit" />
            </Link>
          </div>
        </section>
      </Container>

      <aside
        className={`${styles['wechat-float']} ${
          showWechatQr ? styles['wechat-float-open'] : ''
        }`}
      >
        <div className={styles['wechat-panel']}>
          <button
            type="button"
            className={styles['wechat-close']}
            aria-label="关闭公众号二维码"
            onClick={() => setShowWechatQr(false)}
          >
            ×
          </button>
          <strong>启发星球笔记</strong>
          <span>微信扫码关注公众号</span>
          <img
            src="/images/qrcode_for_gh_e0969fd9d88b_344.jpg"
            alt="启发星球笔记公众号二维码"
          />
        </div>
        <button
          type="button"
          className={styles['wechat-trigger']}
          aria-expanded={showWechatQr}
          onClick={() => setShowWechatQr((current) => !current)}
        >
          关注公众号
        </button>
      </aside>
    </div>
  );
};

export default Home;
