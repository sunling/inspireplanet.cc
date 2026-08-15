/**
 * 微信分享工具模块
 * 提供通用的卡片分享功能，支持微信分享和图片下载
 */

// 声明全局变量类型
interface Window {
  wx?: any;
  html2canvas?: any;
  shareToWechat?: () => Promise<void>;
}

// 分享数据接口
export interface ShareData {
  title: string;
  desc: string;
  link: string;
  imgUrl?: string;
}

// 分享选项接口
export interface ShareOptions {
  cardElement: HTMLElement;
  shareButton: HTMLElement;
  shareData: ShareData;
  downloadFileName?: string;
}

// 初始化分享功能配置接口
export interface InitShareConfig {
  cardSelector: string;
  shareButtonSelector: string;
  getShareData: () => ShareData;
}

// 初始化下载功能配置接口
export interface InitDownloadConfig {
  cardSelector: string;
  downloadButtonSelector: string;
  getFileName?: () => string;
}

function rasterizeTextElement(element: HTMLElement): void {
  const text = element.innerText;
  if (!text) return;

  const style = window.getComputedStyle(element);
  const width = element.clientWidth;
  const fontSize = Number.parseFloat(style.fontSize) || 16;
  const lineHeight = Number.parseFloat(style.lineHeight) || fontSize * 1.5;
  if (!width) return;

  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');
  if (!measureContext) return;
  measureContext.font = style.font;

  const lines: string[] = [];
  text.split('\n').forEach((paragraph) => {
    if (!paragraph) {
      lines.push('');
      return;
    }
    let line = '';
    Array.from(paragraph).forEach((character) => {
      const candidate = line + character;
      if (line && measureContext.measureText(candidate).width > width) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    });
    lines.push(line);
  });

  const scale = 2;
  const height = Math.max(lineHeight, lines.length * lineHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const context = canvas.getContext('2d');
  if (!context) return;
  context.scale(scale, scale);
  context.font = style.font;
  context.fillStyle = style.color;
  context.textBaseline = 'top';
  context.textAlign = style.textAlign === 'center' ? 'center' : 'left';
  const x = style.textAlign === 'center' ? width / 2 : 0;
  lines.forEach((line, index) => {
    context.fillText(line, x, index * lineHeight);
  });

  const image = document.createElement('img');
  image.src = canvas.toDataURL('image/png');
  image.alt = text;
  image.style.cssText = `display:block;width:${width}px;height:${height}px`;
  element.replaceChildren(image);
  element.style.lineHeight = '0';
}

export function isMobileBrowser(): boolean {
  const { userAgent, maxTouchPoints } = window.navigator;
  return (
    /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)
  );
}

/**
 * 普通浏览器触发文件下载；微信内置浏览器展示原图，供用户长按保存。
 */
export function saveImageDataUrl(
  imageDataUrl: string,
  filename: string
): 'downloaded' | 'previewed' {
  if (!isMobileBrowser()) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = imageDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return 'downloaded';
  }

  document.getElementById('wechat-image-save-overlay')?.remove();
  const previousOverflow = document.body.style.overflow;
  const overlay = document.createElement('div');
  overlay.id = 'wechat-image-save-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '长按图片保存到相册');
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'overflow:auto',
    'padding:24px 16px 40px',
    'box-sizing:border-box',
    'background:rgba(18,18,18,.94)',
    'text-align:center',
    'color:#fff',
  ].join(';');

  const title = document.createElement('p');
  title.textContent = '长按图片，选择“保存图片”';
  title.style.cssText = 'margin:0 40px 16px;font-size:16px;font-weight:700';

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '关闭';
  close.setAttribute('aria-label', '关闭图片预览');
  close.style.cssText = [
    'position:fixed',
    'top:14px',
    'right:14px',
    'z-index:1',
    'border:1px solid rgba(255,255,255,.5)',
    'border-radius:999px',
    'padding:7px 12px',
    'background:rgba(0,0,0,.45)',
    'color:#fff',
    'font-size:14px',
  ].join(';');

  const image = document.createElement('img');
  image.src = imageDataUrl;
  image.alt = '可长按保存的图片';
  image.style.cssText =
    'display:block;width:auto;max-width:100%;height:auto;margin:0 auto;background:#fff';

  const cleanup = () => {
    document.removeEventListener('keydown', handleKeyDown);
    overlay.remove();
    document.body.style.overflow = previousOverflow;
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') cleanup();
  };
  close.addEventListener('click', cleanup);
  document.addEventListener('keydown', handleKeyDown);
  overlay.append(title, close, image);
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  close.focus();
  return 'previewed';
}

/**
 * 动态加载微信JS SDK
 * @returns Promise<void>
 */
async function loadWechatSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof (window as Window).wx !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('微信SDK加载失败'));
    document.head.appendChild(script);
  });
}

/**
 * 动态加载html2canvas库
 * @returns Promise<boolean> 加载是否成功
 */
async function loadHtml2Canvas(): Promise<boolean> {
  if (typeof (window as Window).html2canvas !== 'undefined') return true;
  try {
    const { default: html2canvas } = await import('html2canvas');
    (window as Window).html2canvas = html2canvas;
    return true;
  } catch {
    return false;
  }
}

/**
 * 下载卡片为图片
 * @param element 要下载的DOM元素
 * @param filenamePrefix 文件名前缀
 * @returns Promise<boolean> 下载是否成功
 */
export async function loadQRCodeLibrary(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof (window as any).QRCode !== 'undefined') {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = '/scripts/qrcode.min.js';
    script.onload = () => {
      if (
        typeof (window as any).QRCode !== 'undefined' &&
        typeof (window as any).QRCode.toCanvas !== 'function'
      ) {
        (window as any).QRCode.toCanvas = function (
          canvas: HTMLCanvasElement,
          text: string,
          opts: any = {}
        ) {
          return new Promise((resolve) => {
            const temp = document.createElement('div');
            temp.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
            document.body.appendChild(temp);
            try {
              const size = opts.width || 256;
              const colorDark = opts.colorDark || '#000000';
              const colorLight = opts.colorLight || '#ffffff';
              const qr = new (window as any).QRCode(temp, {
                text: text,
                width: size,
                height: size,
                colorDark: colorDark,
                colorLight: colorLight,
                correctLevel: (window as any).QRCode.CorrectLevel?.H || 1,
              });
              const qrCanvas = temp.querySelector('canvas');
              const ctx = canvas.getContext('2d');
              if (qrCanvas && ctx) {
                canvas.width = size;
                canvas.height = size;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(qrCanvas, 0, 0);
              }
              document.body.removeChild(temp);
              resolve(canvas);
            } catch {
              document.body.removeChild(temp);
              resolve(null);
            }
          });
        };
      }
      resolve(true);
    };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export async function downloadCard(
  element: HTMLElement | null | undefined,
  filenamePrefix?: string,
  onImageReady?: (imageDataUrl: string) => void,
  rasterizeText = false
): Promise<boolean> {
  if (!element) {
    console.error('找不到要下载的卡片元素');
    return false;
  }

  // 确保html2canvas已加载
  const isHtml2CanvasLoaded = await loadHtml2Canvas();
  if (
    !isHtml2CanvasLoaded ||
    typeof (window as Window).html2canvas === 'undefined'
  ) {
    console.error('html2canvas库加载失败');
    return false;
  }

  try {
    // html2canvas measures text using the currently loaded font metrics. On
    // slower mobile browsers a fallback font may still be in use here, which
    // makes its measured line boxes differ from the final rendered card and
    // can cause Chinese text to overlap in the exported image.
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    // 创建一个沙箱容器用于干净捕获
    const sandbox = document.createElement('div');
    sandbox.style.position = 'fixed';
    sandbox.style.left = '-9999px';
    sandbox.style.top = '0';
    sandbox.style.zIndex = '-1';
    sandbox.style.background = 'transparent';

    // 克隆卡片进行捕获
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.margin = '0';
    clone.style.width = '420px';
    clone.style.boxSizing = 'border-box';
    clone.style.position = 'relative';

    // 确保渐变背景样式被正确应用
    const computedStyle = window.getComputedStyle(element);
    clone.style.backgroundImage = computedStyle.backgroundImage;
    clone.style.backgroundColor = computedStyle.backgroundColor;
    clone.style.backgroundSize = computedStyle.backgroundSize;
    clone.style.backgroundPosition = computedStyle.backgroundPosition;
    clone.style.backgroundRepeat = computedStyle.backgroundRepeat;

    // 在右下角添加二维码
    const qrCodeLoaded = await loadQRCodeLibrary();
    if (qrCodeLoaded && typeof (window as any).QRCode.toCanvas === 'function') {
      const qrContainer = document.createElement('div');
      qrContainer.style.position = 'absolute';
      qrContainer.style.right = '16px';
      qrContainer.style.bottom = '16px';
      qrContainer.style.width = '60px';
      qrContainer.style.height = '60px';

      const qrCanvas = document.createElement('canvas');
      qrCanvas.width = 120;
      qrCanvas.height = 120;

      const qrColor = computedStyle.color || '#333333';

      await (window as any).QRCode.toCanvas(qrCanvas, window.location.href, {
        width: 120,
        height: 120,
        margin: 1,
        colorDark: qrColor,
        colorLight: '#ffffff',
        correctLevel: (window as any).QRCode.CorrectLevel?.M || 0,
      });

      qrCanvas.style.width = '100%';
      qrCanvas.style.height = '100%';
      qrContainer.appendChild(qrCanvas);
      clone.appendChild(qrContainer);
    }

    sandbox.appendChild(clone);
    document.body.appendChild(sandbox);

    // 等待图片加载完成
    const images = clone.querySelectorAll('img');
    await Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
            } else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          })
      )
    );

    // Give the cloned card two layout/paint cycles after fonts and images are
    // ready before reading its dimensions. One frame is not sufficient on
    // WebKit when a web font changes line wrapping.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

    if (rasterizeText) {
      clone
        .querySelectorAll<HTMLElement>('[data-download-text]')
        .forEach(rasterizeTextElement);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      );
    }

    // 使用html2canvas捕获
    const maxCanvasArea = 15_000_000;
    const captureScale = Math.min(
      3,
      Math.sqrt(
        maxCanvasArea / Math.max(1, clone.offsetWidth * clone.offsetHeight)
      )
    );
    const captureOptions = {
      scale: captureScale,
      logging: false,
      useCORS: true,
      allowTaint: false,
      backgroundColor: 'white',
      imageTimeout: 10000,
      removeContainer: true,
      width: clone.offsetWidth,
      height: clone.offsetHeight,
    };

    const canvas = await (window as Window).html2canvas(clone, captureOptions);

    // 微信内置浏览器会忽略 a[download]。调用方可以接收成图并展示，
    // 让用户直接长按保存到相册。
    if (onImageReady) {
      onImageReady(canvas.toDataURL('image/png', 0.95));
      document.body.removeChild(sandbox);
      return true;
    }

    // 创建下载链接
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob: Blob | null) => {
          if (!blob) {
            resolve(false);
            return;
          }

          const imageUrl = URL.createObjectURL(blob);
          const fileName = `${
            filenamePrefix || 'inspiration-card'
          }-${Date.now()}.png`;

          if (isMobileBrowser()) {
            saveImageDataUrl(canvas.toDataURL('image/png', 0.95), fileName);
          } else {
            saveImageDataUrl(imageUrl, fileName);
          }

          // 清理
          setTimeout(() => {
            document.body.removeChild(sandbox);
            URL.revokeObjectURL(imageUrl);
          }, 100);

          resolve(true);
        },
        'image/png',
        0.95 // 压缩质量
      );
    });
  } catch (error) {
    console.error('下载卡片失败:', error);
    return false;
  }
}

/**
 * 分享卡片到微信
 * @param options 分享配置选项
 * @returns Promise<boolean> 分享是否成功
 */
export async function shareToWechat(options: ShareOptions): Promise<boolean> {
  const {
    cardElement,
    shareButton,
    shareData,
    downloadFileName = `inspiration-card-${new Date().getTime()}`,
  } = options;

  if (!cardElement) {
    alert('请先创建卡片内容再分享');
    return false;
  }

  // 显示生成状态
  const originalText = shareButton.textContent;
  shareButton.textContent = '📱 生成卡片中...';
  (shareButton as HTMLButtonElement).disabled = true;

  try {
    // 调用下载函数生成图片
    const downloadSuccess = await downloadCard(cardElement, downloadFileName);

    if (!downloadSuccess) {
      throw new Error('生成卡片图片失败');
    }

    // 生产环境下的微信分享配置
    if (
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      try {
        await loadWechatSDK();

        if (
          typeof (window as Window).wx !== 'undefined' &&
          (window as Window).wx.updateAppMessageShareData
        ) {
          // 配置微信分享数据
          (window as Window).wx.updateAppMessageShareData({
            title: shareData.title,
            desc: shareData.desc,
            link: shareData.link,
            imgUrl:
              shareData.imgUrl ||
              window.location.origin + '/images/default-share.png',
            success: () => {
              console.log('微信分享配置成功');
            },
            fail: (error: any) => {
              console.warn('微信分享配置失败:', error);
              // 不抛出错误，因为即使配置失败，用户仍然可以通过保存的图片手动分享
            },
          });
        }
      } catch (wxError) {
        console.warn('微信SDK相关操作失败:', wxError);
        // 微信SDK加载失败不影响主要功能
      }
    }

    // 恢复按钮状态
    shareButton.textContent = originalText;
    (shareButton as HTMLButtonElement).disabled = false;

    return true;
  } catch (error) {
    console.error('分享失败:', error);
    // 恢复按钮状态
    shareButton.textContent = originalText;
    (shareButton as HTMLButtonElement).disabled = false;
    alert('生成卡片图片失败，请稍后重试。');

    return false;
  }
}

/**
 * 为页面添加分享功能
 * @param config 配置选项
 */
export function initShareFunction(config: InitShareConfig): void {
  const { cardSelector, shareButtonSelector, getShareData } = config;

  // 创建全局分享函数
  (window as Window).shareToWechat = async function () {
    try {
      const cardElement = document.querySelector<HTMLElement>(cardSelector);
      const shareButton =
        document.querySelector<HTMLElement>(shareButtonSelector);
      const shareData = getShareData();

      if (!cardElement || !shareButton) {
        console.error('找不到卡片元素或分享按钮');
        alert('页面元素加载失败，请刷新页面重试');
        return;
      }

      await shareToWechat({
        cardElement,
        shareButton,
        shareData,
      });
    } catch (error) {
      console.error('执行分享功能时出错:', error);
      alert('分享功能暂不可用，请稍后重试');
    }
  };
}

/**
 * 为页面添加下载功能
 * @param config 配置选项
 */
export function initDownloadFunction(config: InitDownloadConfig): void {
  const { cardSelector, downloadButtonSelector, getFileName } = config;

  // 为下载按钮添加事件监听器
  document.addEventListener('DOMContentLoaded', function () {
    const downloadButton = document.querySelector<HTMLElement>(
      downloadButtonSelector
    );
    if (downloadButton) {
      downloadButton.addEventListener('click', async function () {
        const cardElement = document.querySelector<HTMLElement>(cardSelector);
        if (!cardElement) {
          alert('找不到要下载的卡片内容');
          return;
        }

        // 更改按钮状态
        const originalText = downloadButton.textContent;
        downloadButton.textContent = '下载中...';
        (downloadButton as HTMLButtonElement).disabled = true;

        try {
          const fileName = getFileName ? getFileName() : undefined;
          const success = await downloadCard(cardElement, fileName);

          if (success) {
            // 可以选择在这里显示成功提示
          } else {
            alert('下载失败，请重试');
          }
        } catch (error) {
          console.error('下载卡片时出错:', error);
          alert('下载失败，请重试');
        } finally {
          // 恢复按钮状态
          downloadButton.textContent = originalText;
          (downloadButton as HTMLButtonElement).disabled = false;
        }
      });
    }
  });
}
