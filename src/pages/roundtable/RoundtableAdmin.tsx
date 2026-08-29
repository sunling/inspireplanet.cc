import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  MenuItem,
  TextField,
} from '@mui/material';

import roundtableQuestionsApi, {
  AdminRoundtableQuestion,
  RoundtableQuestionStatus,
} from '../../netlify/services/roundtableQuestions';
import styles from './roundtableAdmin.module.css';

const statusOptions: Array<{
  value: RoundtableQuestionStatus;
  label: string;
}> = [
  { value: 'open', label: '待展开' },
  { value: 'contacted', label: '已联系' },
  { value: 'scheduled', label: '已安排' },
  { value: 'completed', label: '已完成' },
  { value: 'hidden', label: '隐藏' },
];

const RoundtableAdmin: React.FC = () => {
  const [questions, setQuestions] = useState<AdminRoundtableQuestion[]>([]);
  const [filter, setFilter] = useState<'all' | RoundtableQuestionStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await roundtableQuestionsApi.listAdmin();
      if (!response.success) throw new Error(response.error || '读取失败');
      setQuestions(response.data?.questions || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : '读取失败'
      );
    } finally {
      setLoading(false);
    }
  };

  const visibleQuestions = useMemo(
    () =>
      filter === 'all'
        ? questions
        : questions.filter((question) => question.status === filter),
    [filter, questions]
  );

  const patchLocal = (id: string, values: Partial<AdminRoundtableQuestion>) => {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, ...values } : question
      )
    );
  };

  const save = async (question: AdminRoundtableQuestion) => {
    setSavingId(question.id);
    setError('');
    try {
      const response = await roundtableQuestionsApi.update(
        question.id,
        question.status,
        question.scheduledSession || ''
      );
      if (!response.success || !response.data?.question) {
        throw new Error(response.error || '更新失败');
      }
      patchLocal(question.id, response.data.question);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : '更新失败'
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>启发星球 · 管理后台</span>
          <h1>问题圆桌</h1>
          <p>查看提交者的私密信息，联系合适的人，并管理公开问题池的状态。</p>
        </div>
        <Button href="/questions" variant="outlined">
          查看公开页面
        </Button>
      </header>

      <nav className={styles.filters} aria-label="按状态筛选">
        {(['all', ...statusOptions.map((option) => option.value)] as const).map(
          (value) => (
            <button
              type="button"
              key={value}
              className={filter === value ? styles.activeFilter : ''}
              onClick={() => setFilter(value)}
            >
              {value === 'all'
                ? '全部'
                : statusOptions.find((option) => option.value === value)?.label}
              <span>
                {value === 'all'
                  ? questions.length
                  : questions.filter((question) => question.status === value)
                      .length}
              </span>
            </button>
          )
        )}
      </nav>

      {error && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <div className={styles.loading}>
          <CircularProgress size={28} /> 正在读取…
        </div>
      ) : visibleQuestions.length ? (
        <div className={styles.list}>
          {visibleQuestions.map((item) => (
            <article className={styles.card} key={item.id}>
              <div className={styles.cardHeading}>
                <div>
                  <span>{item.name}</span>
                  {item.email ? (
                    <a href={`mailto:${item.email}`}>{item.email}</a>
                  ) : (
                    <small>未留联系方式</small>
                  )}
                </div>
                <time dateTime={item.createdAt}>
                  {new Intl.DateTimeFormat('zh-CN', {
                    dateStyle: 'medium',
                    timeZone: 'Asia/Shanghai',
                  }).format(new Date(item.createdAt))}
                </time>
              </div>

              <h2>{item.question}</h2>
              <small>{item.supportCount} 人也想问</small>
              <p className={styles.context}>
                {item.context || '提交者没有补充背景。'}
              </p>

              <dl>
                <div>
                  <dt>可参加场次</dt>
                  <dd>{item.availableDates.join('、') || '未选择'}</dd>
                </div>
                {item.otherAvailability && (
                  <div>
                    <dt>其他时间</dt>
                    <dd>{item.otherAvailability}</dd>
                  </div>
                )}
                <div>
                  <dt>不希望被触碰</dt>
                  <dd>{item.boundaries || '未填写'}</dd>
                </div>
              </dl>

              <div className={styles.controls}>
                <TextField
                  select
                  label="状态"
                  value={item.status}
                  onChange={(event) =>
                    patchLocal(item.id, {
                      status: event.target.value as RoundtableQuestionStatus,
                    })
                  }
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="安排场次（公开显示）"
                  placeholder="例如：EP35 · 9月5日"
                  value={item.scheduledSession || ''}
                  inputProps={{ maxLength: 120 }}
                  onChange={(event) =>
                    patchLocal(item.id, {
                      scheduledSession: event.target.value,
                    })
                  }
                />
                <Button
                  variant="contained"
                  disabled={savingId === item.id}
                  onClick={() => save(item)}
                >
                  {savingId === item.id ? '保存中…' : '保存'}
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>这个状态下还没有问题。</p>
      )}
    </main>
  );
};

export default RoundtableAdmin;
