import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, CircularProgress, Switch } from '@mui/material';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';
import { useSearchParams } from 'react-router-dom';

import { episodesApi } from '@/netlify/config';
import { EpisodeCardContext } from '@/netlify/functions/episodes';
import { saveImageDataUrl } from '@/utils/share';
import styles from './episodeCardCreate.module.css';

const MAX_TEXT_LENGTH = 180;
const DEFAULT_INSPIRE_PLANET_MEETUP_ID = 39;

type PhotoMode = 'cover' | 'contain' | 'illustration';

const EpisodeCardCreate: React.FC = () => {
  const [searchParams] = useSearchParams();
  const episodeNumber = Number(
    searchParams.get('episode') || searchParams.get('episodeId')
  );
  const meetupId = Number(
    searchParams.get('meetupId') || DEFAULT_INSPIRE_PLANET_MEETUP_ID
  );
  const previewRef = useRef<HTMLDivElement>(null);
  const [episode, setEpisode] = useState<EpisodeCardContext | null>(null);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoMode, setPhotoMode] = useState<PhotoMode>('cover');
  const [showEpisodeInfo, setShowEpisodeInfo] = useState(true);
  const [showQrCode, setShowQrCode] = useState(true);
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
          text: '这是我从这次相遇里带走的一句话。',
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

  const cardTitle = episode.theme || episode.meetup.title;
  const dateLabel = episode.date
    ? new Date(`${episode.date}T00:00:00`).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';
  const usesBackgroundPhoto = photo && photoMode !== 'illustration';

  return (
    <main className={styles.page}>
      <section className={styles.editor}>
        <p className={styles.eyebrow}>启发星球 EP{episode.episode_number}</p>
        <h1>这次相遇，你想带走什么？</h1>
        <p className={styles.description}>
          写下一句话、一段感受，或者一个接下来想做的行动。
        </p>

        {error && <Alert severity="warning">{error}</Alert>}

        <textarea
          value={text}
          maxLength={MAX_TEXT_LENGTH}
          onChange={(event) => setText(event.target.value)}
          placeholder="不需要整理成完整答案，写下此刻想到的就好……"
          className={styles.textarea}
          autoFocus
        />
        <div className={styles.counter}>
          {text.length}/{MAX_TEXT_LENGTH}
        </div>

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
                铺满裁切
              </button>
              <button
                type="button"
                className={photoMode === 'contain' ? styles.activeMode : ''}
                onClick={() => setPhotoMode('contain')}
              >
                完整显示
              </button>
              <button
                type="button"
                className={photoMode === 'illustration' ? styles.activeMode : ''}
                onClick={() => setPhotoMode('illustration')}
              >
                作为插图
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
            显示本期信息
          </label>
          <label>
            <Switch
              checked={showQrCode}
              onChange={(_, value) => setShowQrCode(value)}
            />
            显示邀请二维码
          </label>
        </div>
      </section>

      <section className={styles.previewSection}>
        <div
          ref={previewRef}
          className={`${styles.card} ${
            usesBackgroundPhoto ? styles.cardWithPhoto : ''
          } ${photoMode === 'contain' ? styles.photoContain : ''}`}
          style={
            usesBackgroundPhoto
              ? { backgroundImage: `url(${photo})` }
              : undefined
          }
        >
          {usesBackgroundPhoto && <div className={styles.overlay} />}
          <div className={styles.cardContent}>
            <div className={styles.mainContent}>
              {photo && photoMode === 'illustration' && (
                <img
                  src={photo}
                  alt="用户选择的插图"
                  className={styles.illustration}
                />
              )}
              <div className={styles.quote}>
                {text.trim() || '你想从这次相遇带走什么？'}
              </div>
            </div>
            <div className={styles.cardFooter}>
              {showEpisodeInfo && (
                <div className={styles.episodeInfo}>
                  <strong>启发星球 EP{episode.episode_number}</strong>
                  <span>{cardTitle}</span>
                  {dateLabel && <span>{dateLabel}</span>}
                </div>
              )}
              {showQrCode && (
                <div className={styles.qrBlock}>
                  <QRCodeSVG value={shareUrl} size={74} bgColor="#ffffff" />
                  <span>扫码写下你的启发</span>
                </div>
              )}
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
