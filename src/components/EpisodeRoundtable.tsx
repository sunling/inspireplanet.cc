import React, { useEffect, useState } from 'react';
import { Alert, Button, CircularProgress } from '@mui/material';
import { Link } from 'react-router-dom';
import roundtableQuestionsApi, {
  PublicRoundtableQuestion,
} from '../netlify/services/roundtableQuestions';
import styles from '../pages/episode/episodeHub.module.css';

const EpisodeRoundtable: React.FC<{
  episodeNumber: number;
  year: number | null;
}> = ({ episodeNumber, year }) => {
  const [questions, setQuestions] = useState<PublicRoundtableQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setQuestions([]);
    setError('');
    if (!year) {
      setLoading(false);
      return;
    }
    setLoading(true);
    roundtableQuestionsApi
      .listByEpisode(episodeNumber, year)
      .then((response) => {
        if (!active) return;
        if (!response.success)
          throw new Error(response.error || '读取问题圆桌失败');
        setQuestions(response.data?.questions || []);
      })
      .catch(() => {
        if (active) setError('暂时无法读取本期圆桌，请重试。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [episodeNumber, year, attempt]);

  return (
    <section
      className={`${styles.section} ${styles.roundtableSection}`}
      id="roundtable"
      aria-labelledby="roundtable-heading"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p>本期问题圆桌</p>
          <h2 id="roundtable-heading">一起展开一个真实问题</h2>
        </div>
        <Link to="/questions">查看问题池 →</Link>
      </div>
      {loading ? (
        <CircularProgress size={24} aria-label="正在读取本期圆桌" />
      ) : error ? (
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              onClick={() => setAttempt((value) => value + 1)}
            >
              重试
            </Button>
          }
        >
          {error}
        </Alert>
      ) : questions.length ? (
        <div className={styles.topicList}>
          {questions.map((question) => (
            <article className={styles.topicCard} key={question.id}>
              <div className={`${styles.topicHeader} ${styles.roundtableMeta}`}>
                <span className={styles.topicSpeaker}>
                  {question.name} ·{' '}
                  {question.status === 'completed' ? '已展开' : '已安排'}
                </span>
                <time dateTime={question.sessionDate || undefined}>
                  {question.sessionDate}（北京时间）
                </time>
              </div>
              <h3>{question.question}</h3>
              {question.context && (
                <p className={styles.roundtableContext}>{question.context}</p>
              )}
              {question.scheduledSession && <p>{question.scheduledSession}</p>}
              <Link
                className={styles.roundtableLink}
                to={`/questions#question-${question.id}`}
              >
                回到这个问题 →
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.pendingCard}>
          <p>本期暂未关联圆桌问题。</p>
          <Link to="/questions">去问题池看看，或带来你的问题 →</Link>
        </div>
      )}
    </section>
  );
};

export default EpisodeRoundtable;
