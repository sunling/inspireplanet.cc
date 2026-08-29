import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  TextField,
} from '@mui/material';
import { QRCodeSVG as QRCode } from 'qrcode.react';

import { roundtableQuestionsApi } from '../../netlify/config';
import {
  CreateRoundtableQuestionInput,
  PublicRoundtableQuestion,
  RoundtableQuestionStatus,
} from '../../netlify/services/roundtableQuestions';
import styles from './questionRoundtable.module.css';

type FormState = CreateRoundtableQuestionInput;

interface QuestionRoundtableProps {
  embedded?: boolean;
  sessionDate?: string;
  sessionLabel?: string;
}

const createInitialForm = (sessionDate?: string): FormState => ({
  name: '',
  email: '',
  question: '',
  context: '',
  boundaries: '',
  availableDates: sessionDate ? [sessionDate] : [],
  otherAvailability: '',
  website: '',
});

const questionStarters = [
  '我没想明白的是……',
  '如果……会怎么样？',
  '我不同意的一点是……',
  '我想请有经验的人聊聊……',
];

const SUPPORTED_QUESTIONS_KEY = 'roundtable-supported-questions';
const SUPPORTER_TOKEN_KEY = 'roundtable-supporter-token';

const readSupportedQuestionIds = () => {
  try {
    return new Set<string>(
      JSON.parse(localStorage.getItem(SUPPORTED_QUESTIONS_KEY) || '[]')
    );
  } catch {
    return new Set<string>();
  }
};

const getSupporterToken = () => {
  const current = localStorage.getItem(SUPPORTER_TOKEN_KEY);
  if (current) return current;
  const token = crypto.randomUUID();
  localStorage.setItem(SUPPORTER_TOKEN_KEY, token);
  return token;
};

const processSteps = [
  {
    number: '01',
    title: '讲清情境',
    description:
      '场景提交者用几分钟说说发生了什么、试过什么，以及真正卡住的地方。',
  },
  {
    number: '02',
    title: '澄清提问',
    description: '大家先不急着回应，只问帮助理解具体情境的问题。',
  },
  {
    number: '03',
    title: '分享经历',
    description: '分享“我曾经经历过什么”，不告诉对方“你应该怎么做”。',
  },
];

const statusLabels: Record<RoundtableQuestionStatus, string> = {
  open: '等待展开',
  contacted: '正在联系',
  scheduled: '已安排',
  completed: '已展开',
  hidden: '已隐藏',
};

const getUpcomingSaturdayOptions = () => {
  const now = new Date();
  const beijingParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);
  const part = (type: string) =>
    Number(beijingParts.find((item) => item.type === type)?.value);
  const start = Date.UTC(part('year'), part('month') - 1, part('day'));

  return Array.from({ length: 43 }, (_, index) => {
    const date = new Date(start + index * 24 * 60 * 60 * 1000);
    if (date.getUTCDay() !== 6 || date.getTime() <= start) return null;
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    return {
      value: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      label: `${month}月${day}日（周六）早上 8:00（北京时间）`,
    };
  })
    .filter((option): option is { value: string; label: string } =>
      Boolean(option)
    )
    .slice(0, 5);
};

const QuestionRoundtable: React.FC<QuestionRoundtableProps> = ({
  embedded = false,
  sessionDate,
  sessionLabel,
}) => {
  const [questions, setQuestions] = useState<PublicRoundtableQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState<FormState>(() =>
    createInitialForm(sessionDate)
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [supportingId, setSupportingId] = useState<string | null>(null);
  const [supportError, setSupportError] = useState('');
  const [supportedQuestionIds, setSupportedQuestionIds] = useState(
    readSupportedQuestionIds
  );
  const questionInputRef = useRef<HTMLInputElement>(null);
  const saturdayOptions = useMemo(getUpcomingSaturdayOptions, []);
  const submitSectionId = embedded
    ? 'meetup-submit-question'
    : 'submit-question';
  const questionPoolId = embedded ? 'meetup-question-pool' : 'question-pool';
  const Root = embedded ? 'section' : 'main';
  const submissionUrl = `${window.location.origin}${window.location.pathname}${window.location.search}#${submitSectionId}`;

  useEffect(() => {
    loadQuestions();
    setForm(createInitialForm(sessionDate));
  }, [sessionDate]);

  const loadQuestions = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await roundtableQuestionsApi.listPublic(sessionDate);
      if (!response.success) throw new Error(response.error || '读取失败');
      setQuestions(response.data?.questions || []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '读取问题失败');
    } finally {
      setLoading(false);
    }
  };

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleDate = (date: string) => {
    update(
      'availableDates',
      form.availableDates.includes(date)
        ? form.availableDates.filter((item) => item !== date)
        : [...form.availableDates, date]
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError('');
    setSubmitted(false);
    setSubmitting(true);
    try {
      const response = await roundtableQuestionsApi.create(form);
      if (!response.success) throw new Error(response.error || '提交失败');
      if (response.data?.question) {
        setQuestions((current) => [response.data!.question!, ...current]);
      }
      setForm(createInitialForm(sessionDate));
      setSubmitted(true);
      window.setTimeout(() => {
        document
          .getElementById(questionPoolId)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const startWith = (starter: string) => {
    update('question', form.question.trim() ? form.question : starter);
    window.setTimeout(() => {
      questionInputRef.current?.focus();
      questionInputRef.current?.setSelectionRange(
        starter.length - 1,
        starter.length - 1
      );
    });
  };

  const supportQuestion = async (id: string) => {
    if (supportedQuestionIds.has(id) || supportingId) return;
    setSupportingId(id);
    setSupportError('');
    try {
      const response = await roundtableQuestionsApi.support(
        id,
        getSupporterToken()
      );
      if (!response.success || !response.data) {
        throw new Error(response.error || '暂时无法支持');
      }
      setQuestions((current) =>
        current.map((question) =>
          question.id === id
            ? { ...question, supportCount: response.data!.supportCount }
            : question
        )
      );
      setSupportedQuestionIds((current) => {
        const next = new Set(current).add(id);
        localStorage.setItem(
          SUPPORTED_QUESTIONS_KEY,
          JSON.stringify([...next])
        );
        return next;
      });
    } catch (error) {
      setSupportError(error instanceof Error ? error.message : '暂时无法支持');
    } finally {
      setSupportingId(null);
    }
  };

  return (
    <Root className={`${styles.page} ${embedded ? styles.embedded : ''}`}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            {embedded
              ? `${sessionLabel || '本期活动'} · 真实场景圆桌`
              : '启发星球 · 真实场景圆桌'}
          </span>
          <h1>把没想明白的那一点带来</h1>
          <p className={styles.lead}>
            {embedded
              ? '一句话也可以，默认匿名。我们会在本期活动的最后 20 分钟，从大家共同关心的问题里选择一个一起展开。'
              : '一句话也可以，默认匿名。我们会在每次启发星球的最后 20 分钟，从大家共同关心的问题里选择一个一起展开。'}
          </p>
          <a className={styles.primaryLink} href={`#${submitSectionId}`}>
            写下一个问题 <span aria-hidden="true">↓</span>
          </a>
        </div>
        <aside className={styles.principle}>
          <div className={styles.principleCopy}>
            <span>我们的边界</span>
            <p>先理解，再回应。</p>
            <strong>分享经历，不提供建议。</strong>
          </div>
          {embedded && (
            <div className={styles.embeddedQr}>
              <QRCode
                value={submissionUrl}
                size={112}
                bgColor="#ffffff"
                fgColor="#334a46"
                level="M"
              />
              <span>扫码，一句话提问</span>
            </div>
          )}
        </aside>
      </section>

      <section
        className={styles.submitSection}
        id={submitSectionId}
        aria-labelledby="submit-title"
      >
        <div className={styles.formIntro}>
          <span className={styles.eyebrow}>30 秒提问</span>
          <h2 id="submit-title">一句话就够了</h2>
          <p>只需要写下问题。默认匿名；背景、称呼和联系方式都可以之后再补。</p>
          <div className={styles.afterSubmit}>
            <strong>提交之后</strong>
            <span>问题会进入下方问题池</span>
            <span>大家可以点“我也想问”</span>
            <span>共同关心的问题会优先进入圆桌</span>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <TextField
            inputRef={questionInputRef}
            required
            multiline
            minRows={4}
            label="此刻，你最想和大家讨论什么？"
            placeholder="半句话也可以，先写下来……"
            helperText={`唯一必填项 · ${
              form.name.trim()
                ? '将以你的称呼公开在问题池'
                : '将匿名公开在问题池'
            }`}
            value={form.question}
            inputProps={{ minLength: 5, maxLength: 500 }}
            onChange={(event) => update('question', event.target.value)}
          />

          <div className={styles.starters} aria-label="问题开头参考">
            <span>不知道怎么说？点一个开头</span>
            <div>
              {questionStarters.map((starter) => (
                <button
                  type="button"
                  key={starter}
                  onClick={() => startWith(starter)}
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>

          {sessionDate && (
            <div className={styles.sessionNotice}>
              <span>提交到本期</span>
              <strong>{sessionLabel || sessionDate}</strong>
            </div>
          )}

          <details className={styles.optionalDetails}>
            <summary>愿意多说一点？补充背景或留下联系方式（选填）</summary>
            <div className={styles.optionalFields}>
              <TextField
                multiline
                minRows={4}
                label="可以说说当下的情境吗？"
                helperText="为什么它此刻重要？你试过什么？真正卡住的地方是什么？这段会公开。"
                value={form.context}
                inputProps={{ maxLength: 5000 }}
                onChange={(event) => update('context', event.target.value)}
              />

              <div className={styles.twoColumns}>
                <TextField
                  label="公开称呼（选填）"
                  helperText="留空就是“匿名星友”"
                  value={form.name}
                  inputProps={{ maxLength: 80 }}
                  onChange={(event) => update('name', event.target.value)}
                />
                <TextField
                  type="email"
                  label="联系邮箱（选填，不公开）"
                  helperText="愿意参加圆桌时再留下"
                  value={form.email}
                  inputProps={{ maxLength: 320 }}
                  onChange={(event) => update('email', event.target.value)}
                />
              </div>

              {!sessionDate && (
                <fieldset className={styles.availability}>
                  <legend>如果愿意参加，哪些场次方便？（选填）</legend>
                  <p>启发星球固定在北京时间周六早上 8 点进行，可以多选。</p>
                  <div>
                    {saturdayOptions.map((option) => (
                      <FormControlLabel
                        key={option.value}
                        control={
                          <Checkbox
                            checked={form.availableDates.includes(option.value)}
                            onChange={() => toggleDate(option.value)}
                          />
                        }
                        label={option.label}
                      />
                    ))}
                  </div>
                  <TextField
                    fullWidth
                    label="其他方便时间（选填）"
                    value={form.otherAvailability}
                    inputProps={{ maxLength: 500 }}
                    onChange={(event) =>
                      update('otherAvailability', event.target.value)
                    }
                  />
                </fieldset>
              )}

              <TextField
                multiline
                minRows={3}
                label="不希望在现场被询问或公开的内容（选填）"
                helperText="例如人名、公司、家庭信息或其他私人经历。这里的内容只对组织者可见。"
                value={form.boundaries}
                inputProps={{ maxLength: 2000 }}
                onChange={(event) => update('boundaries', event.target.value)}
              />
            </div>
          </details>

          <div className={styles.honeypot} aria-hidden="true">
            <label>
              Website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(event) => update('website', event.target.value)}
              />
            </label>
          </div>

          {submitError && <Alert severity="error">{submitError}</Alert>}
          {submitted && (
            <Alert severity="success">
              已经收到。问题不需要完美，我们会帮你把它带到圆桌上。
            </Alert>
          )}
          <div className={styles.submitActions}>
            <Button
              className={styles.submitButton}
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
            >
              {submitting
                ? '正在提交…'
                : form.name.trim()
                  ? `以 ${form.name.trim()} 提交`
                  : '匿名提交问题'}
            </Button>
            <span>问题和填写的背景会公开；邮箱与边界说明不会公开。</span>
          </div>
        </form>
      </section>

      <section className={styles.process} aria-labelledby="process-title">
        <div className={styles.sectionHeading}>
          <span>{embedded ? '本期最后 20 分钟' : '每期最后 20 分钟'}</span>
          <h2 id="process-title">我们会怎样一起展开？</h2>
        </div>
        <ol>
          {processSteps.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
        <p className={styles.processNote}>
          这不是专家咨询，也不追求现场找到统一答案。提问是为了理解，经历属于分享者自己，场景提交者可以判断什么对自己有用。
        </p>
      </section>

      <section
        className={styles.questionPool}
        id={questionPoolId}
        aria-labelledby="pool-title"
      >
        <div className={styles.poolHeading}>
          <div className={styles.sectionHeading}>
            <span>正在发生的场景</span>
            <h2 id="pool-title">{embedded ? '本期场景' : '场景池'}</h2>
          </div>
          <p>不必重复组织一个相似的问题。看到共同的困惑，点一下“我也想问”。</p>
        </div>

        {supportError && (
          <Alert severity="error" className={styles.supportError}>
            {supportError}
          </Alert>
        )}

        {loading ? (
          <div className={styles.loading}>
            <CircularProgress size={26} /> 正在读取问题…
          </div>
        ) : loadError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={loadQuestions}>
                重试
              </Button>
            }
          >
            {loadError}
          </Alert>
        ) : questions.length ? (
          <div className={styles.questionGrid}>
            {questions.map((item) => (
              <article className={styles.questionCard} key={item.id}>
                <div className={styles.cardMeta}>
                  <span>{item.name}</span>
                  <time dateTime={item.createdAt}>
                    {new Intl.DateTimeFormat('zh-CN', {
                      month: 'long',
                      day: 'numeric',
                      timeZone: 'Asia/Shanghai',
                    }).format(new Date(item.createdAt))}
                  </time>
                </div>
                <h3>{item.question}</h3>
                {item.context && <p>{item.context}</p>}
                <footer>
                  <div>
                    <span className={`${styles.status} ${styles[item.status]}`}>
                      {statusLabels[item.status]}
                    </span>
                    {item.status === 'scheduled' && item.scheduledSession && (
                      <span>{item.scheduledSession}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.supportButton}
                    aria-pressed={supportedQuestionIds.has(item.id)}
                    disabled={
                      supportedQuestionIds.has(item.id) ||
                      supportingId === item.id
                    }
                    onClick={() => supportQuestion(item.id)}
                  >
                    {supportedQuestionIds.has(item.id)
                      ? '你也想问'
                      : '我也想问'}
                    {item.supportCount > 0 && <span>{item.supportCount}</span>}
                  </button>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <p>{embedded ? '本期还没有人提交场景。' : '场景池还是空的。'}</p>
            <a href={`#${submitSectionId}`}>提交第一个真实场景</a>
          </div>
        )}
      </section>
    </Root>
  );
};

export default QuestionRoundtable;
