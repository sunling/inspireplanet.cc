import React, { useEffect, useMemo, useState } from 'react';
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
  publicConsent: false,
  website: '',
});

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
    if (!form.availableDates.length && !form.otherAvailability.trim()) {
      setSubmitError('请选择一个可以参加的场次，或填写其他方便时间。');
      return;
    }
    if (!form.publicConsent) {
      setSubmitError('请确认你了解称呼、问题和背景会在提交后公开。');
      return;
    }

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

  return (
    <Root className={`${styles.page} ${embedded ? styles.embedded : ''}`}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            {embedded
              ? `${sessionLabel || '本期活动'} · 真实场景圆桌`
              : '启发星球 · 真实场景圆桌'}
          </span>
          <h1>带着一个正在发生的情境来</h1>
          <p className={styles.lead}>
            {embedded
              ? '不需要先把它想明白。写下你正在经历的具体情境，我们会在本期活动的最后 20 分钟，选择一个场景一起展开。'
              : '不需要先把它想明白。写下你正在经历的具体情境，我们会在每次启发星球的最后 20 分钟，选择一个场景一起展开。'}
          </p>
          <a className={styles.primaryLink} href={`#${submitSectionId}`}>
            提交我的场景 <span aria-hidden="true">↓</span>
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
              <span>扫码提交本期场景</span>
            </div>
          )}
        </aside>
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
        className={styles.submitSection}
        id={submitSectionId}
        aria-labelledby="submit-title"
      >
        <div className={styles.formIntro}>
          <span className={styles.eyebrow}>提交场景</span>
          <h2 id="submit-title">从你此刻知道的部分开始</h2>
          <p>
            称呼、问题和背景会直接出现在下方的场景池。邮箱
            {sessionDate ? '' : '、可参加时间'}
            和你不希望被触碰的内容只对组织者可见。
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.twoColumns}>
            <TextField
              required
              label="希望我们怎样称呼你？"
              value={form.name}
              inputProps={{ maxLength: 80 }}
              onChange={(event) => update('name', event.target.value)}
            />
            <TextField
              required
              type="email"
              label="联系邮箱（不会公开）"
              value={form.email}
              inputProps={{ maxLength: 320 }}
              onChange={(event) => update('email', event.target.value)}
            />
          </div>

          <TextField
            required
            multiline
            minRows={3}
            label="你现在最想一起看清楚的问题是什么？"
            helperText="尽量从一个具体、正在发生的问题开始。"
            value={form.question}
            inputProps={{ minLength: 5, maxLength: 500 }}
            onChange={(event) => update('question', event.target.value)}
          />

          <TextField
            required
            multiline
            minRows={6}
            label="可以说说当下的情境吗？"
            helperText="为什么它此刻重要？你试过什么？真正卡住的地方是什么？"
            value={form.context}
            inputProps={{ minLength: 10, maxLength: 5000 }}
            onChange={(event) => update('context', event.target.value)}
          />

          {sessionDate ? (
            <div className={styles.sessionNotice}>
              <span>提交到本期</span>
              <strong>{sessionLabel || sessionDate}</strong>
            </div>
          ) : (
            <fieldset className={styles.availability}>
              <legend>未来哪些场次你可以参加？</legend>
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
            label="有没有不希望在现场被询问或公开的内容？（选填）"
            helperText="例如具体人名、公司、家庭信息或其他私人经历。这里的内容不会公开。"
            value={form.boundaries}
            inputProps={{ maxLength: 2000 }}
            onChange={(event) => update('boundaries', event.target.value)}
          />

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

          <FormControlLabel
            className={styles.consent}
            control={
              <Checkbox
                required
                checked={form.publicConsent}
                onChange={(event) =>
                  update('publicConsent', event.target.checked)
                }
              />
            }
            label={`我了解：我的称呼、问题和背景会在提交后直接公开；联系方式${sessionDate ? '' : '、可参加时间'}和边界说明不会公开。`}
          />

          {submitError && <Alert severity="error">{submitError}</Alert>}
          {submitted && (
            <Alert severity="success">
              场景已经收到，也已经出现在场景池里。我们会通过邮箱联系适合在近期展开的场景提交者。
            </Alert>
          )}
          <Button
            className={styles.submitButton}
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting}
          >
            {submitting ? '正在提交…' : '提交并公开场景'}
          </Button>
        </form>
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
          <p>
            这些问题不需要成熟、宏大或正确。它们只是一个人当下真实站立的地方。
          </p>
        </div>

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
                <p>{item.context}</p>
                <footer>
                  <span className={`${styles.status} ${styles[item.status]}`}>
                    {statusLabels[item.status]}
                  </span>
                  {item.status === 'scheduled' && item.scheduledSession && (
                    <span>{item.scheduledSession}</span>
                  )}
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
