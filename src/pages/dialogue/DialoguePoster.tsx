import React, { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import styles from './dialoguePoster.module.css';

const siteOrigin = 'https://inspireplanet.cc';
const posterBackgroundColor = '#f7f1e8';

interface PosterTextStyle {
  fontSize: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';
}

const defaultTextStyles = {
  eyebrow: { fontSize: 18, color: '#c85d3c', textAlign: 'left' },
  title: { fontSize: 65, color: '#263a36', textAlign: 'left' },
  description: { fontSize: 23, color: '#5c554f', textAlign: 'left' },
  qrLabel: { fontSize: 13, color: '#263a36', textAlign: 'center' },
} satisfies Record<string, PosterTextStyle>;

const presets = {
  community: {
    title: '加入启发星球微信群',
    description: '和我们一起分享最近的启发、问题和行动。',
    label: '加入微信群',
    url: `${siteOrigin}/join`,
  },
  dialogue: {
    title: '一起把问题说清楚',
    description: '带着一个最近真实面对、还没有想清楚的问题来。',
    label: '对话实验报名',
    url: `${siteOrigin}/clarify-together/participant`,
  },
  cards: {
    title: '创建一张启发卡片',
    description: '把此刻触动你的想法、句子和经历，做成一张可以分享的卡片。',
    label: '启发星球 · 创建卡片',
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

interface TextStyleControlsProps {
  value: PosterTextStyle;
  onChange: (value: PosterTextStyle) => void;
}

const TextStyleControls: React.FC<TextStyleControlsProps> = ({
  value,
  onChange,
}) => (
  <div className={styles.textStyleControls}>
    <label>
      字号
      <span className={styles.numberInput}>
        <input
          type="number"
          min="8"
          max="120"
          value={value.fontSize}
          onChange={(event) =>
            onChange({
              ...value,
              fontSize: Math.min(
                120,
                Math.max(8, Number(event.target.value) || 8),
              ),
            })
          }
        />
        <span>px</span>
      </span>
    </label>
    <label>
      颜色
      <span className={styles.colorInput}>
        <input
          type="color"
          value={value.color}
          onChange={(event) => onChange({ ...value, color: event.target.value })}
        />
        <span>{value.color.toUpperCase()}</span>
      </span>
    </label>
    <div className={styles.alignControl}>
      <span>水平对齐</span>
      <div role="group" aria-label="水平对齐">
        {(
          [
            ['left', '左'],
            ['center', '中'],
            ['right', '右'],
          ] as const
        ).map(([alignment, label]) => (
          <button
            key={alignment}
            type="button"
            aria-pressed={value.textAlign === alignment}
            onClick={() => onChange({ ...value, textAlign: alignment })}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  </div>
);

const DialoguePoster: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initial = {
    title: searchParams.get('title') || presets.community.title,
    description:
      searchParams.get('description') || presets.community.description,
    label: searchParams.get('label') || presets.community.label,
    url: searchParams.get('url') || presets.community.url,
  };
  const posterRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [label, setLabel] = useState(initial.label);
  const [qrLabel, setQrLabel] = useState(`扫码进入：${initial.label}`);
  const [url, setUrl] = useState(initial.url);
  const [qrColor, setQrColor] = useState('#273a36');
  const [textStyles, setTextStyles] = useState(defaultTextStyles);
  const [downloading, setDownloading] = useState(false);
  const qrUrl = useMemo(() => normalizeUrl(url), [url]);

  const applyPreset = (preset: (typeof presets)[keyof typeof presets]) => {
    setTitle(preset.title);
    setDescription(preset.description);
    setLabel(preset.label);
    setQrLabel(`扫码进入：${preset.label}`);
    setUrl(preset.url);
  };

  const updateTextStyle = (
    field: keyof typeof defaultTextStyles,
    value: PosterTextStyle,
  ) => {
    setTextStyles((current) => ({ ...current, [field]: value }));
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
        exportEyebrow.style.lineHeight = '1.45';
      }
      if (exportTitle) {
        exportTitle.style.margin = '28px 0 18px';
        exportTitle.style.lineHeight = '1.12';
      }
      if (exportDescription) {
        exportDescription.style.lineHeight = '1.7';
      }
      if (exportQr instanceof SVGElement) {
        exportQr.style.width = '172px';
        exportQr.style.height = '172px';
      }
      if (exportQrLabel) {
        exportQrLabel.style.lineHeight = '1.4';
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
        backgroundColor: posterBackgroundColor,
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
            <span
              data-poster-eyebrow
              style={{
                fontSize: textStyles.eyebrow.fontSize,
                color: textStyles.eyebrow.color,
                textAlign: textStyles.eyebrow.textAlign,
              }}
            >
              启发星球 · {label || '页面分享'}
            </span>
            <strong
              data-poster-title
              style={{
                fontSize: textStyles.title.fontSize,
                color: textStyles.title.color,
                textAlign: textStyles.title.textAlign,
              }}
            >
              {title || '页面标题'}
            </strong>
            <p
              data-poster-description
              style={{
                fontSize: textStyles.description.fontSize,
                color: textStyles.description.color,
                textAlign: textStyles.description.textAlign,
              }}
            >
              {description || '用一句话告诉大家这个页面是做什么的。'}
            </p>
          </div>

          <div className={styles.posterBottom}>
            <div className={styles.qrBox}>
              <QRCodeSVG
                value={qrUrl}
                size={172}
                level="H"
                bgColor={posterBackgroundColor}
                fgColor={qrColor}
                marginSize={2}
                className="poster-export-qr"
              />
              <span
                data-poster-qr-label
                style={{
                  fontSize: textStyles.qrLabel.fontSize,
                  color: textStyles.qrLabel.color,
                  textAlign: textStyles.qrLabel.textAlign,
                }}
              >
                {qrLabel || '扫码进入：启发星球页面'}
              </span>
            </div>
          </div>
        </div>

        <aside className={styles.editor}>
          <div className={styles.editorField}>
            <label>
              海报标题
              <textarea
                rows={2}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <TextStyleControls
              value={textStyles.title}
              onChange={(value) => updateTextStyle('title', value)}
            />
          </div>
          <div className={styles.editorField}>
            <label>
              这个页面是做什么的
              <textarea
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <TextStyleControls
              value={textStyles.description}
              onChange={(value) => updateTextStyle('description', value)}
            />
          </div>
          <div className={styles.editorField}>
            <label>
              页面类型
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="例如：活动详情"
              />
            </label>
            <TextStyleControls
              value={textStyles.eyebrow}
              onChange={(value) => updateTextStyle('eyebrow', value)}
            />
          </div>
          <div className={styles.editorField}>
            <label>
              扫码说明
              <textarea
                rows={2}
                value={qrLabel}
                onChange={(event) => setQrLabel(event.target.value)}
                placeholder="例如：扫码进入活动详情"
              />
            </label>
            <TextStyleControls
              value={textStyles.qrLabel}
              onChange={(value) => updateTextStyle('qrLabel', value)}
            />
          </div>
          <label>
            页面地址
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="可填写 /create-card 或完整网址"
            />
          </label>
          <label className={styles.qrColorField}>
            二维码颜色
            <span className={styles.colorInput}>
              <input
                type="color"
                value={qrColor}
                onChange={(event) => setQrColor(event.target.value)}
              />
              <span>{qrColor.toUpperCase()}</span>
            </span>
            <small>背景自动与海报底色融合，请选择较深的二维码颜色。</small>
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
