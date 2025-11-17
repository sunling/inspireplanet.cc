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

    // 使用cardUtils中的downloadCard功能
    const { downloadCard } = await import('./cardUtils.js');
    
    // 为卡片元素添加临时ID以便downloadCard函数使用
    const tempId = `temp-share-card-${Date.now()}`;
    const originalId = cardElement.id;
    cardElement.id = tempId;
    
    try {
      // 调用cardUtils中的downloadCard函数
      downloadCard(`#${tempId}`, downloadFileName.replace('.png', '-'));
      
      // 生产环境下的微信分享配置（如果需要）
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        if (typeof wx !== 'undefined' && wx.config) {
          wx.ready(() => {
            wx.updateAppMessageShareData({
              title: shareData.title,
              desc: shareData.desc,
              link: shareData.link,
              imgUrl: window.location.origin + '/images/default-share.png', // 使用默认分享图片
              success: () => {
                console.log('分享配置成功');
              },
              fail: (error) => {
                console.error('分享配置失败:', error);
              }
            });
          });
        }
      }
    } finally {
      // 恢复原始ID
      if (originalId) {
        cardElement.id = originalId;
      } else {
        cardElement.removeAttribute('id');
      }
    }

    // 分享功能已通过downloadCard完成
    
    // 恢复按钮状态
    shareButton.textContent = originalText;
    shareButton.disabled = false;

  } catch (error) {
    console.error('分享失败:', error);
    // 恢复按钮状态
    shareButton.textContent = originalText;
    shareButton.disabled = false;
    alert('生成卡片图片失败，请稍后重试。');
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