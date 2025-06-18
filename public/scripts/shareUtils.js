/**
 * 微信分享工具模块
 * 提供通用的卡片分享功能，支持微信分享和图片下载
 */

// 动态加载微信JS SDK
function loadWechatSDK() {
  return new Promise((resolve, reject) => {
    if (typeof wx !== 'undefined') {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * 分享卡片到微信
 * @param {Object} options 分享配置选项
 * @param {HTMLElement} options.cardElement 要分享的卡片DOM元素
 * @param {HTMLElement} options.shareButton 分享按钮元素
 * @param {Object} options.shareData 分享数据
 * @param {string} options.shareData.title 分享标题
 * @param {string} options.shareData.desc 分享描述
 * @param {string} options.shareData.link 分享链接
 * @param {string} options.downloadFileName 下载文件名（可选）
 */
export async function shareToWechat(options) {
  const {
    cardElement,
    shareButton,
    shareData,
    downloadFileName = `inspiration-card-${new Date().getTime()}.png`
  } = options;

  if (!cardElement) {
    alert('请先创建卡片内容再分享');
    return;
  }

  // 显示生成状态
  const originalText = shareButton.textContent;
  shareButton.textContent = '📱 生成卡片中...';
  shareButton.disabled = true;

  try {
    // 确保html2canvas已加载
    if (typeof html2canvas === 'undefined') {
      throw new Error('html2canvas未加载，请确保已引入html2canvas库');
    }

    // 使用html2canvas生成卡片图片
    const canvas = await html2canvas(cardElement, {
      backgroundColor: null,
      scale: 2, // 提高图片质量
      useCORS: false, // 禁用CORS以避免跨域问题
      allowTaint: true, // 允许污染画布
      logging: false,
      proxy: undefined, // 不使用代理
      foreignObjectRendering: false // 禁用外部对象渲染
    });

    // 将canvas转换为blob
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png', 0.9);
    });

    // 创建图片URL
    const imageUrl = URL.createObjectURL(blob);

    // 检查是否在本地开发环境
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
      // 本地开发环境：直接下载图片
      const link = document.createElement('a');
      link.download = downloadFileName;
      link.href = canvas.toDataURL('image/png');
      link.click();

      // 恢复按钮状态
      shareButton.textContent = originalText;
      shareButton.disabled = false;

      alert('本地开发环境：卡片已下载到您的设备！在生产环境中将支持微信分享。');
      return;
    }

    // 生产环境：配置微信分享
    try {
      // 获取当前页面URL
      const currentUrl = window.location.href;

      // 调用签名API
      const response = await fetch(`http://8.134.113.39/sign?url=${encodeURIComponent(currentUrl)}`);
      const signData = await response.json();

      // 检查微信JS SDK是否已加载
      if (typeof wx === 'undefined') {
        // 动态加载微信JS SDK
        await loadWechatSDK();
      }

      // 配置微信JS SDK
      wx.config({
        debug: false,
        appId: signData.appId,
        timestamp: signData.timestamp,
        nonceStr: signData.nonceStr,
        signature: signData.signature,
        jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData']
      });

      wx.ready(function() {
        const finalShareData = {
          title: shareData.title,
          desc: shareData.desc,
          link: shareData.link || currentUrl,
          imgUrl: imageUrl // 使用生成的卡片图片
        };

        // 分享到朋友圈
        wx.updateTimelineShareData(finalShareData);

        // 分享给朋友
        wx.updateAppMessageShareData(finalShareData);

        // 恢复按钮状态
        shareButton.textContent = originalText;
        shareButton.disabled = false;

        alert('卡片已准备好分享！请在微信中打开此页面进行分享。');
      });

      wx.error(function(res) {
        console.error('微信配置失败:', res);
        shareButton.textContent = originalText;
        shareButton.disabled = false;
        alert('微信分享配置失败，请稍后重试。');
      });
    } catch (apiError) {
      console.error('API调用失败:', apiError);
      // API失败时降级为下载图片
      const link = document.createElement('a');
      link.download = downloadFileName;
      link.href = canvas.toDataURL('image/png');
      link.click();

      shareButton.textContent = originalText;
      shareButton.disabled = false;
      alert('微信分享暂时不可用，卡片已下载到您的设备！');
    }

  } catch (error) {
    console.error('分享失败:', error);
    // 恢复按钮状态
    shareButton.textContent = originalText;
    shareButton.disabled = false;
    alert('生成卡片图片失败，请稍后重试。');
  }
}

/**
 * 简单的下载卡片功能
 * @param {HTMLElement} cardElement 要下载的卡片DOM元素
 * @param {string} fileName 下载文件名（可选）
 */
export async function downloadCard(cardElement, fileName = `inspiration-card-${new Date().getTime()}.png`) {
  if (!cardElement) {
    alert('未找到卡片内容');
    return;
  }

  try {
    // 确保html2canvas已加载
    if (typeof html2canvas === 'undefined') {
      throw new Error('html2canvas未加载，请确保已引入html2canvas库');
    }

    // 使用html2canvas生成卡片图片
    const canvas = await html2canvas(cardElement, {
      backgroundColor: null,
      scale: 2,
      useCORS: false,
      allowTaint: true,
      logging: false,
      proxy: undefined,
      foreignObjectRendering: false
    });

    // 下载图片
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    link.click();

  } catch (error) {
    console.error('下载失败:', error);
    alert('下载卡片失败，请稍后重试。');
  }
}

/**
 * 为页面添加分享功能
 * @param {Object} config 配置选项
 * @param {string} config.cardSelector 卡片元素选择器
 * @param {string} config.shareButtonSelector 分享按钮选择器
 * @param {Function} config.getShareData 获取分享数据的函数
 */
export function initShareFunction(config) {
  const {
    cardSelector,
    shareButtonSelector,
    getShareData
  } = config;

  // 创建全局分享函数
  window.shareToWechat = async function() {
    const cardElement = document.querySelector(cardSelector);
    const shareButton = document.querySelector(shareButtonSelector);
    const shareData = getShareData();

    await shareToWechat({
      cardElement,
      shareButton,
      shareData
    });
  };
}

/**
 * 为页面添加下载功能
 * @param {Object} config 配置选项
 * @param {string} config.cardSelector 卡片元素选择器
 * @param {string} config.downloadButtonSelector 下载按钮选择器
 * @param {Function} config.getFileName 获取文件名的函数（可选）
 */
export function initDownloadFunction(config) {
  const {
    cardSelector,
    downloadButtonSelector,
    getFileName
  } = config;

  // 为下载按钮添加事件监听器
  document.addEventListener('DOMContentLoaded', function() {
    const downloadButton = document.querySelector(downloadButtonSelector);
    if (downloadButton) {
      downloadButton.addEventListener('click', async function() {
        const cardElement = document.querySelector(cardSelector);
        const fileName = getFileName ? getFileName() : undefined;
        await downloadCard(cardElement, fileName);
      });
    }
  });
}