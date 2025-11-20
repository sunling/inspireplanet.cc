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
  return new Promise((resolve) => {
    if (typeof (window as Window).html2canvas !== 'undefined') {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * 下载卡片为图片
 * @param element 要下载的DOM元素
 * @param filenamePrefix 文件名前缀
 * @returns Promise<boolean> 下载是否成功
 */
export async function downloadCard(
  element: HTMLElement | null | undefined,
  filenamePrefix?: string
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

    // 确保渐变背景样式被正确应用
    const computedStyle = window.getComputedStyle(element);
    clone.style.backgroundImage = computedStyle.backgroundImage;
    clone.style.backgroundColor = computedStyle.backgroundColor;
    clone.style.backgroundSize = computedStyle.backgroundSize;
    clone.style.backgroundPosition = computedStyle.backgroundPosition;
    clone.style.backgroundRepeat = computedStyle.backgroundRepeat;

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
              img.onerror = () => resolve(); // 即使图片加载失败也继续
            }
          })
      )
    );

    // 使用html2canvas捕获
    const canvas = await (window as Window).html2canvas(clone, {
      scale: 3, // 高清导出
      logging: false,
      useCORS: true,
      allowTaint: false,
      backgroundColor: 'white',
      imageTimeout: 10000,
      removeContainer: true,
      width: clone.offsetWidth,
      height: clone.offsetHeight,
    });

    // 创建下载链接
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob: Blob | null) => {
          if (!blob) {
            resolve(false);
            return;
          }

          const link = document.createElement('a');
          link.download = `${
            filenamePrefix || 'inspiration-card'
          }-${Date.now()}.png`;
          link.href = URL.createObjectURL(blob);
          document.body.appendChild(link);
          link.click();

          // 清理
          setTimeout(() => {
            document.body.removeChild(link);
            document.body.removeChild(sandbox);
            URL.revokeObjectURL(link.href);
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
