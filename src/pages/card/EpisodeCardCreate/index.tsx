import React, {
  ChangeEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Button, CircularProgress, Switch } from '@mui/material';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';
import { useSearchParams } from 'react-router-dom';

import { episodesApi } from '@/netlify/config';
import { EpisodeCardContext } from '@/netlify/functions/episodes';
import { getUserName } from '@/utils';
import { saveImageDataUrl } from '@/utils/share';
import styles from './episodeCardCreate.module.css';

const MAX_TEXT_LENGTH = 500;
const MAX_AUTHOR_LENGTH = 24;
const DEFAULT_INSPIRE_PLANET_MEETUP_ID = 39;

type PhotoMode = 'cover' | 'contain';

const EpisodeCardCreate: React.FC = () => {
  const [searchParams] = useSearchParams();
  const episodeNumber = Number(
    searchParams.get('episode') || searchParams.get('episodeId')
  );
  const meetupId = Number(
    searchParams.get('meetupId') || DEFAULT_INSPIRE_PLANET_MEETUP_ID
  );
  const previewRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLDivElement>(null);
  const [episode, setEpisode] = useState<EpisodeCardContext | null>(null);
  const [text, setText] = useState('');
  const [author, setAuthor] = useState(() => getUserName() || '');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoMode, setPhotoMode] = useState<PhotoMode>('cover');
  const [showEpisodeInfo, setShowEpisodeInfo] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEpisode = async () => {
      if (!episodeNumber || !meetupId) {
        setError('缺少有效的活动或期数信息');
        setIsLoading(false);
        return;
      }

      try {
        const response = await episodesApi.getByMeetupEpisode(
          meetupId,
          episodeNumber
        );
        if (!response.success || !response.data?.episode) {
          throw new Error(response.error || '无法读取本期活动');
        }
        setEpisode(response.data.episode);
      } catch (err) {
        setError(err instanceof Error ? err.message : '无法读取本期活动');
      } finally {
        setIsLoading(false);
      }
    };

    loadEpisode();
  }, [episodeNumber, meetupId]);

  const shareUrl = useMemo(
    () =>
      `${window.location.origin}/create-card?meetupId=${meetupId}&episode=${episodeNumber}`,
    [episodeNumber, meetupId]
  );

  const displayText = text.trim() || '写下此刻值得留下的想法。';
  const displayAuthor = author.trim() || '匿名';
  const weightedLength =
    Array.from(displayText).length +
    Math.max(0, displayText.split('\n').length - 1) * 12;
  const hasLongText = weightedLength > 180;

  useLayoutEffect(() => {
    const container = mainContentRef.current;
    const quote = quoteRef.current;
    if (!container || !quote) return;

    const fitText = () => {
      const initialSize =
        weightedLength > 420
          ? 13
          : weightedLength > 300
            ? 15
            : weightedLength > 180
              ? 18
              : weightedLength > 110
                ? 24
                : weightedLength > 72
                  ? 31
                  : 42;
      let fontSize = initialSize;

      quote.style.fontSize = `${fontSize}px`;
      quote.style.lineHeight =
        weightedLength > 300 ? '1.32' : weightedLength > 180 ? '1.4' : '1.5';

      while (
        container.scrollHeight > container.clientHeight &&
        fontSize > 10
      ) {
        fontSize -= 1;
        quote.style.fontSize = `${fontSize}px`;
      }
    };

    const animationFrame = window.requestAnimationFrame(fitText);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [displayText, weightedLength, photo, photoMode, showEpisodeInfo, author]);

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('图片请控制在 8MB 以内');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(String(reader.result));
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const renderCanvas = async () => {
    if (!previewRef.current || !text.trim()) return null;
    return html2canvas(previewRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderCanvas();
      if (!canvas) return;
      saveImageDataUrl(
        canvas.toDataURL('image/png'),
        `inspire-planet-ep${episode?.episode_number}-${Date.now()}.png`
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderCanvas();
      if (!canvas) return;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (!blob) return;

      const file = new File([blob], 'inspire-planet-card.png', {
        type: 'image/png',
      });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `启发星球 EP${episode?.episode_number}`,
          text: `这是 ${displayAuthor} 想记录下来的一点启发。`,
        });
      } else {
        saveImageDataUrl(canvas.toDataURL('image/png'), file.name);
      }
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        setError('分享失败，请先保存图片后再分享');
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.state}>
        <CircularProgress />
      </div>
    );
  }

  if (error && !episode) {
    return (
      <div className={styles.state}>
        <Alert severity="error">{error}</Alert>
      </div>
    );
  }

  if (!episode) return null;

  return (
    <main className={styles.page}>
      <section className={styles.editor}>
        <p className={styles.eyebrow}>启发星球 EP{episode.episode_number}</p>
        <h1>你想记录下什么？</h1>
        <p className={styles.description}>
          无论是现场参与、听完回放，还是后来想到的，都可以写下来。
        </p>

        {error && <Alert severity="warning">{error}</Alert>}

        <textarea
          value={text}
          maxLength={MAX_TEXT_LENGTH}
          onChange={(event) => setText(event.target.value)}
          placeholder="一句话、一段感受，或者一个接下来想做的行动……"
          className={styles.textarea}
          autoFocus
        />
        <div className={styles.counter}>
          {text.length}/{MAX_TEXT_LENGTH} · 卡片会根据可用空间自动缩放
        </div>

        <label className={styles.authorField}>
          <span>署名</span>
          <input
            type="text"
            value={author}
            maxLength={MAX_AUTHOR_LENGTH}
            onChange={(event) => setAuthor(event.target.value)}
            placeholder="你的名字或昵称"
          />
          <small>留空时显示“匿名”</small>
        </label>

        <label className={styles.photoButton}>
          ＋ 添加一张照片（可选）
          <input type="file" accept="image/*" onChange={handlePhoto} hidden />
        </label>
        {photo && (
          <>
            <div className={styles.photoModes} aria-label="照片展示方式">
              <button
                type="button"
                className={photoMode === 'cover' ? styles.activeMode : ''}
                onClick={() => setPhotoMode('cover')}
              >
                铺满画面
              </button>
              <button
                type="button"
                className={photoMode === 'contain' ? styles.activeMode : ''}
                onClick={() => setPhotoMode('contain')}
              >
                完整显示
              </button>
            </div>
            <button
              type="button"
              className={styles.removePhoto}
              onClick={() => setPhoto(null)}
            >
              移除照片
            </button>
          </>
        )}

        <div className={styles.settings}>
          <label>
            <Switch
              checked={showEpisodeInfo}
              onChange={(_, value) => setShowEpisodeInfo(value)}
            />
            顶部显示期次
          </label>
          <p className={styles.qrNote}>
            二维码固定在卡片右下角，作为邀请其他人继续表达的回应印章。
          </p>
        </div>
      </section>

      <section className={styles.previewSection}>
        <div
          ref={previewRef}
          className={`${styles.card} ${photo ? styles.cardWithPhoto : ''} ${
            photoMode === 'contain' ? styles.photoContain : ''
          } ${hasLongText ? styles.cardLongText : ''}`}
        >
          {photo && (
            <>
              <div
                className={styles.photoLayer}
                style={{ backgroundImage: `url(${photo})` }}
              />
              {photoMode === 'contain' && (
                <div
                  className={styles.photoForeground}
                  style={{ backgroundImage: `url(${photo})` }}
                />
              )}
            </>
          )}
          {photo && <div className={styles.overlay} />}
          <div className={styles.cardContent}>
            <div className={styles.topMeta}>
              <div className={styles.brandChip}>
                {showEpisodeInfo
                  ? `启发星球 EP${episode.episode_number}`
                  : '启发星球'}
              </div>
              <div className={styles.expressionCue}>真实 · 自由 · 不必完整</div>
            </div>

            <div ref={mainContentRef} className={styles.mainContent}>
              <div className={styles.textPanel}>
                <div className={styles.qrFloat}>
                  <QRCodeSVG value={shareUrl} size={54} bgColor="#ffffff" />
                  <span>扫码回应</span>
                </div>
                <div ref={quoteRef} className={styles.quote}>
                  {displayText}
                </div>
                <div className={styles.byline}>— {displayAuthor}</div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            variant="contained"
            size="large"
            disabled={!text.trim() || isExporting}
            onClick={handleShare}
          >
            {isExporting ? '正在生成…' : '生成并分享'}
          </Button>
          <Button
            variant="outlined"
            size="large"
            disabled={!text.trim() || isExporting}
            onClick={handleDownload}
          >
            保存图片
          </Button>
        </div>
        <p className={styles.privacy}>照片只在你的浏览器中处理，不会自动上传。</p>
      </section>
    </main>
  );
};

export default EpisodeCardCreate;
