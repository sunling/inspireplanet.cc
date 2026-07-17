import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import treeholeApi, {
  TreeholeQuestion,
  TreeholeResponse,
} from '../../netlify/services/treehole';
import { isOrganizer } from '../../utils/user';
import styles from './treehole.module.css';

const responseStarters = [
  '我也经历过类似的事情……',
  '读到这里，我感受到……',
  '有一个对我有帮助的尝试是……',
  '我没有答案，只是想告诉你……',
];

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));

const Treehole: React.FC = () => {
  const { id } = useParams();
  return id ? <QuestionDetail id={Number(id)} /> : <QuestionList />;
};

const QuestionList: React.FC = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<TreeholeQuestion[]>([]);
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const response = await treeholeApi.list();
      if (response.success) {
        setQuestions(response.data?.questions || []);
      } else {
        setError(response.error || '暂时无法读取树洞。');
      }
      setLoading(false);
    };
    void load();
  }, []);

  const submitQuestion = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const response = await treeholeApi.createQuestion({ content, email });
    setSubmitting(false);

    if (!response.success || !response.data?.question) {
      setError(response.error || '问题发布失败，请稍后再试。');
      return;
    }

    navigate(`/treehole/${response.data.question.id}`);
  };

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span>树洞互助</span>
        <h1>让此刻的问题先被听见</h1>
        <p>
          有些问题不一定马上有答案。你可以匿名写下困扰，也可以给一个陌生人留下一段真诚的回应。
        </p>
      </header>

      <section className={styles.askCard}>
        <div className={styles.sectionHeading}>
          <span>写下你的问题</span>
          <h2>最近有什么事情在你心里反复出现？</h2>
        </div>
        <form onSubmit={submitQuestion}>
          <label>
            <span className={styles.visuallyHidden}>你想说的话</span>
            <textarea
              required
              minLength={10}
              maxLength={2000}
              rows={6}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="不需要先想清楚，写下你此刻知道的部分就好。"
            />
          </label>
          <label className={styles.optionalField}>
            <span>
              邮箱 <small>选填</small>
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="有新回应时通知你"
            />
            <small>邮箱不会公开，也不会提供给回应者。</small>
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? '发布中……' : '匿名发布'}
          </button>
        </form>
      </section>

      <section className={styles.questionsSection}>
        <div className={styles.sectionHeading}>
          <span>此刻，有人在问</span>
          <h2>一些等待回声的问题</h2>
        </div>
        {loading ? (
          <p className={styles.empty}>正在读取……</p>
        ) : questions.length ? (
          <div className={styles.questionGrid}>
            {questions.map((question) => (
              <Link
                key={question.id}
                to={`/treehole/${question.id}`}
                className={styles.questionCard}
              >
                <p>{question.content}</p>
                <footer>
                  <span>{formatDate(question.createdAt)}</span>
                  <strong>
                    {question.responseCount
                      ? `${question.responseCount} 条回应`
                      : '等待回应'}
                    {' →'}
                  </strong>
                </footer>
              </Link>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>还没有人写下问题。你可以成为第一个。</p>
        )}
      </section>
    </main>
  );
};

const QuestionDetail: React.FC<{ id: number }> = ({ id }) => {
  const navigate = useNavigate();
  const [question, setQuestion] = useState<TreeholeQuestion | null>(null);
  const [responses, setResponses] = useState<TreeholeResponse[]>([]);
  const [content, setContent] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const organizer = isOrganizer();

  useEffect(() => {
    const load = async () => {
      if (!Number.isInteger(id) || id <= 0) {
        setError('问题不存在。');
        setLoading(false);
        return;
      }
      const response = await treeholeApi.detail(id);
      if (response.success && response.data) {
        setQuestion(response.data.question);
        setResponses(response.data.responses);
      } else {
        setError(response.error || '问题不存在。');
      }
      setLoading(false);
    };
    void load();
  }, [id]);

  const submitResponse = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSent(false);
    setSubmitting(true);
    const result = await treeholeApi.createResponse({
      questionId: id,
      content,
      nickname,
    });
    setSubmitting(false);

    if (!result.success || !result.data?.response) {
      setError(result.error || '回应送出失败，请稍后再试。');
      return;
    }

    setResponses((current) => [...current, result.data!.response]);
    setQuestion((current) =>
      current
        ? { ...current, responseCount: current.responseCount + 1 }
        : current
    );
    setContent('');
    setNickname('');
    setSent(true);
  };

  const hideQuestion = async () => {
    if (!window.confirm('隐藏这个问题吗？')) return;
    const result = await treeholeApi.deleteQuestion(id);
    if (result.success) navigate('/treehole');
    else setError(result.error || '隐藏失败。');
  };

  const hideResponse = async (responseId: number) => {
    if (!window.confirm('隐藏这条回应吗？')) return;
    const result = await treeholeApi.deleteResponse(responseId);
    if (result.success) {
      setResponses((current) =>
        current.filter((item) => item.id !== responseId)
      );
    } else {
      setError(result.error || '隐藏失败。');
    }
  };

  if (loading) return <main className={styles.statePage}>正在读取……</main>;
  if (!question) {
    return (
      <main className={styles.statePage}>
        <p>{error}</p>
        <Link to="/treehole">返回树洞</Link>
      </main>
    );
  }

  return (
    <main className={styles.detailPage}>
      <Link to="/treehole" className={styles.backLink}>
        ← 返回树洞
      </Link>

      <article className={styles.featuredQuestion}>
        <span>一个匿名的问题</span>
        <p>{question.content}</p>
        <footer>
          <span>{formatDate(question.createdAt)}</span>
          {organizer && (
            <button type="button" onClick={hideQuestion}>
              隐藏问题
            </button>
          )}
        </footer>
      </article>

      <section className={styles.responseSection}>
        <div className={styles.sectionHeading}>
          <span>留下一段回应</span>
          <h2>你不需要解决这个问题</h2>
          <p>
            分享一段相似经历、一个不同视角，或者只是让对方知道“有人听见了”，都可以。
          </p>
        </div>
        <form className={styles.responseForm} onSubmit={submitResponse}>
          <div className={styles.starters}>
            {responseStarters.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => setContent(starter)}
              >
                {starter}
              </button>
            ))}
          </div>
          <textarea
            required
            minLength={2}
            maxLength={2000}
            rows={7}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="你想对 TA 说什么？"
          />
          <label className={styles.optionalField}>
            <span>
              怎么称呼你 <small>选填</small>
            </span>
            <input
              maxLength={40}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="默认显示“一位路过的人”"
            />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          {sent && (
            <p className={styles.success}>
              谢谢你留下这段回应。它已经抵达这里。
            </p>
          )}
          <button type="submit" disabled={submitting}>
            {submitting ? '送出中……' : '送出回应'}
          </button>
        </form>
      </section>

      <section className={styles.responsesList}>
        <div className={styles.sectionHeading}>
          <span>已经收到的回声</span>
          <h2>
            {responses.length
              ? `${responses.length} 条回应`
              : '还在等待第一段回应'}
          </h2>
        </div>
        {responses.map((response) => (
          <article key={response.id} className={styles.responseCard}>
            <p>{response.content}</p>
            <footer>
              <span>
                — {response.nickname} · {formatDate(response.createdAt)}
              </span>
              {organizer && (
                <button type="button" onClick={() => hideResponse(response.id)}>
                  隐藏
                </button>
              )}
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
};

export default Treehole;
