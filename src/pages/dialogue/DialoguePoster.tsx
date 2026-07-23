import React, { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import styles from './dialoguePoster.module.css';

const siteOrigin = 'https://inspireplanet.cc';

const presets = {
  community: {
    eyebrow: '启发星球 · 加入微信群',
    title: '加入启发星球微信群',
    description: '和我们一起分享最近的启发、问题和行动。',
    qrLabel: '扫码进入：加入微信群',
    url: `${siteOrigin}/join`,
  },
  dialogue: {
    eyebrow: '启发星球 · 对话实验报名',
    title: '一起把问题说清楚',
    description: '带着一个最近真实面对、还没有想清楚的问题来。',
    qrLabel: '扫码进入：对话实验报名',
    url: `${siteOrigin}/clarify-together/participant`,
  },
  cards: {
    eyebrow: '启发星球 · 创建卡片',
    title: '创建一张启发卡片',
    description: '把此刻触动你的想法、句子和经历，做成一张可以分享的卡片。',
    qrLabel: '扫码进入：创建启发卡片',
    url: `${siteOrigin}/create-card`,
  },
};

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return siteOrigin;
  if (trimmed.startsWith('/')) return `${siteOrigin}${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${siteOrigin}/${trimmed.replace(/^\/+/, '')}`;
};

const wrapTextForExport = (element: HTMLElement) => {
  const text = element.textContent || '';
  element.textContent = '';

  Array.from(text).forEach((character) => {
    const span = document.createElement('span');
    span.style.display = 'inline';
    span.textContent = character;
    element.appendChild(span);
  });
};

const DialoguePoster: React.FC = () => {
  const [searchParams] = useSearchParams();
  const legacyLabel = searchParams.get('label');
  const initial = {
    eyebrow:
      searchParams.get('eyebrow') ||
      (legacyLabel ? `启发星球 · ${legacyLabel}` : presets.community.eyebrow),
    title: searchParams.get('title') || presets.community.title,
    description:
      searchParams.get('description') || presets.community.description,
    qrLabel:
      searchParams.get('qrLabel') ||
      (legacyLabel ? `扫码进入：${legacyLabel}` : presets.community.qrLabel),
    url: searchParams.get('url') || presets.community.url,
  };
  const posterRef = useRef<HTMLDivElement>(null);
  const [eyebrow, setEyebrow] = useState(initial.eyebrow);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [qrLabel, setQrLabel] = useState(initial.qrLabel);
  const [url, setUrl] = useState(initial.url);
  const [downloading, setDownloading] = useState(false);
  const qrUrl = useMemo(() => normalizeUrl(url), [url]);

  const applyPreset = (preset: (typeof presets)[keyof typeof presets]) => {
    setEyebrow(preset.eyebrow);
    setTitle(preset.title);
    setDescription(preset.description);
    setQrLabel(preset.qrLabel);
    setUrl(preset.url);
  };

  const downloadPoster = async () => {
    if (!posterRef.current) return;
    setDownloading(true);
    let exportPoster: HTMLDivElement | null = null;
    try {
      await document.fonts?.ready;

      exportPoster = posterRef.current.cloneNode(true) as HTMLDivElement;
      Object.assign(exportPoster.style, {
        position: 'fixed',
        top: '0',
        left: '-10000px',
        width: '720px',
        gap: '30px',
        padding: '24px 64px',
        boxShadow: 'none',
      });

      const exportEyebrow = exportPoster.querySelector(
        '[data-poster-eyebrow]',
      ) as HTMLElement | null;
      const exportTitle = exportPoster.querySelector(
        '[data-poster-title]',
      ) as HTMLElement | null;
      const exportDescription = exportPoster.querySelector(
        '[data-poster-description]',
      ) as HTMLElement | null;
      const exportQrLabel = exportPoster.querySelector(
        '[data-poster-qr-label]',
      ) as HTMLElement | null;
      const exportQr = exportPoster.querySelector('.poster-export-qr');

      if (exportEyebrow) {
        exportEyebrow.style.fontSize = '18px';
        exportEyebrow.style.lineHeight = '26px';
      }
      if (exportTitle) {
        exportTitle.style.margin = '28px 0 18px';
        exportTitle.style.fontSize = '65px';
        exportTitle.style.lineHeight = '73px';
      }
      if (exportDescription) {
        exportDescription.style.fontSize = '23px';
        exportDescription.style.lineHeight = '39px';
      }
      if (exportQr instanceof SVGElement) {
        exportQr.style.width = '172px';
        exportQr.style.height = '172px';
      }
      if (exportQrLabel) {
        exportQrLabel.style.fontSize = '13px';
        exportQrLabel.style.lineHeight = '18px';
      }

      [exportEyebrow, exportTitle, exportDescription, exportQrLabel].forEach(
        (element) => element && wrapTextForExport(element),
      );

      document.body.appendChild(exportPoster);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      const canvas = await html2canvas(exportPoster, {
        scale: 2,
        backgroundColor: '#f7f1e8',
        useCORS: true,
        logging: false,
        width: 720,
        windowWidth: 720,
      });
      const link = document.createElement('a');
      const safeTitle = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-');
      link.download = `${safeTitle || '页面'}-分享海报.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      exportPoster?.remove();
      setDownloading(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span>启发星球 · 通用工具</span>
        <h1>页面分享海报</h1>
        <p>为站内任意页面生成一张说明用途、带访问二维码的简单海报。</p>
      </header>

      <div className={styles.presetBar}>
        <span>快捷预设</span>
        <button type="button" onClick={() => applyPreset(presets.community)}>
          加入微信群
        </button>
        <button type="button" onClick={() => applyPreset(presets.dialogue)}>
          对话实验报名
        </button>
        <button type="button" onClick={() => applyPreset(presets.cards)}>
          创建卡片
        </button>
      </div>

      <div className={styles.workspace}>
        <div className={styles.poster} ref={posterRef}>
          <div className={styles.orbit} aria-hidden="true" />
          <div className={styles.posterTop}>
            <span data-poster-eyebrow>{eyebrow}</span>
            <strong data-poster-title>{title}</strong>
            <p data-poster-description>{description}</p>
          </div>

          <div className={styles.posterBottom}>
            <div className={styles.qrBox}>
              <QRCodeSVG
                value={qrUrl}
                size={172}
                level="H"
                bgColor="#fffdf9"
                fgColor="#273a36"
                marginSize={2}
                className="poster-export-qr"
              />
              <span data-poster-qr-label>{qrLabel}</span>
            </div>
          </div>
        </div>

        <aside className={styles.editor}>
          <label>
            顶部文字
            <input
              value={eyebrow}
              onChange={(event) => setEyebrow(event.target.value)}
            />
          </label>
          <label>
            海报标题
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            这个页面是做什么的
            <textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label>
            二维码下方文字
            <input
              value={qrLabel}
              onChange={(event) => setQrLabel(event.target.value)}
            />
          </label>
          <label>
            页面地址
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="可填写 /create-card 或完整网址"
            />
          </label>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={downloadPoster}
              disabled={downloading}
            >
              {downloading ? '正在生成…' : '下载海报 PNG'}
            </button>
            <a href={qrUrl} target="_blank" rel="noreferrer">
              打开目标页面
            </a>
            <Link to="/create-card">创建启发卡片</Link>
          </div>
          <small>二维码统一使用正式域名，即使在本地制作也可以直接分享。</small>
        </aside>
      </div>
    </main>
  );
};

export default DialoguePoster;
