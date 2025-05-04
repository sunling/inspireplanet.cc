// cardDetail.js - Handles dynamic loading and functionality for the card detail page

import {
  fetchAirtableCards,
  renderCard,
  themes
} from './cardUtils.js';

// Get the card ID from the URL parameter
function getCardIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// Sanitize and validate data
function sanitizeContent(content) {
  if (!content) return '';
  
  // Use DOMPurify to sanitize content
  const sanitized = DOMPurify.sanitize(content);
  return sanitized;
}

// Render a single card based on its ID
async function renderCardDetail() {
  const cardContainer = document.getElementById('card-container');
  const downloadBtn = document.getElementById('download-btn');
  
  if (!cardContainer) return;
  
  try {
    const cardId = getCardIdFromUrl();
    
    if (!cardId) {
      cardContainer.innerHTML = '<div class="error-message">未找到卡片ID，请返回卡片列表页面重试。</div>';
      downloadBtn.style.display = 'none';
      return;
    }
    
    // Show loading indicator
    cardContainer.innerHTML = '<div class="loading">加载中...</div>';
    
    // Fetch all cards from Airtable
    const cards = await fetchAirtableCards();
    
    if (!Array.isArray(cards) || cards.length === 0) {
      cardContainer.innerHTML = '<div class="error-message">加载卡片数据失败，请稍后再试。</div>';
      downloadBtn.style.display = 'none';
      return;
    }
    
    // Find the card with the matching ID
    const card = cards.find(c => c.id === cardId);
    
    if (!card) {
      cardContainer.innerHTML = '<div class="error-message">未找到该卡片，可能已被删除或ID无效。</div>';
      downloadBtn.style.display = 'none';
      return;
    }
    
    // Prepare card data for rendering
    const normalizedCardData = {
      title: sanitizeContent(card.Title) || "默认标题",
      quote: sanitizeContent(card.Quote) || "默认金句",
      detail: sanitizeContent(card.Detail) || "",
      imagePath: card.ImagePath || "",
      creator: sanitizeContent(card.Creator) || "匿名",
      font: card.Font || "'Noto Sans SC', sans-serif",
      theme: card.Theme || themes.mistyblue,
      customImage: card.Upload || "",
      created: card.Created
    };
    
    // Clear container
    cardContainer.innerHTML = '';
    
    // Create card element with a specific ID for downloading
    const cardElement = renderCard(normalizedCardData, { 
      mode: 'list', 
      cardId: 'detail-card' 
    });
    
    // Append the card to the container
    cardContainer.appendChild(cardElement);
    
    // Setup download button
    downloadBtn.addEventListener('click', () => {
      downloadCard();
    });
    
  } catch (error) {
    console.error('加载卡片详情失败:', error);
    cardContainer.innerHTML = '<div class="error-message">加载失败，请稍后再试。</div>';
    downloadBtn.style.display = 'none';
  }
}

// Download the card as an image using html2canvas
function downloadCard() {
  const cardElement = document.getElementById('detail-card');
  
  if (!cardElement) {
    console.warn('找不到卡片元素');
    return;
  }
  
  // Change button text to indicate download in progress
  const downloadBtn = document.getElementById('download-btn');
  const originalText = downloadBtn.textContent;
  downloadBtn.textContent = '下载中...';
  downloadBtn.disabled = true;
  
  // Create a sandbox container for clean capture
  const sandbox = document.createElement("div");
  sandbox.style.position = "fixed";
  sandbox.style.left = "-9999px";
  sandbox.style.top = "0";
  sandbox.style.zIndex = "-1";
  sandbox.style.background = "white";
  
  // Clone the card for capturing
  const clone = cardElement.cloneNode(true);
  clone.style.margin = "0";
  clone.style.width = "420px";
  clone.style.boxSizing = "border-box";
  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);
  
  // Make sure all images are loaded
  const images = clone.querySelectorAll('img');
  const imagePromises = Array.from(images).map(img => {
    return new Promise((resolve) => {
      if (img.complete && img.naturalWidth > 0) {
        resolve();
        return;
      }
      
      const src = img.src;
      img.onload = () => resolve();
      img.onerror = () => {
        console.warn("图片加载失败:", src);
        resolve();
      };
      
      // Force reload the src
      img.src = src;
      
      // Timeout fallback
      setTimeout(resolve, 5000);
    });
  });
  
  // When all images are loaded, capture the card
  Promise.all(imagePromises)
    .then(() => new Promise(resolve => setTimeout(resolve, 200))) // Small delay
    .then(() => {
      html2canvas(clone, {
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        imageTimeout: 5000,
      }).then(canvas => {
        canvas.toBlob(blob => {
          // Create download link
          const link = document.createElement('a');
          link.download = `inspiration-card-${Date.now()}.png`;
          link.href = URL.createObjectURL(blob);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          document.body.removeChild(sandbox);
          
          // Restore button state
          downloadBtn.textContent = originalText;
          downloadBtn.disabled = false;
        }, "image/png");
      }).catch(err => {
        console.error("截图失败", err);
        document.body.removeChild(sandbox);
        
        // Restore button state
        downloadBtn.textContent = originalText;
        downloadBtn.disabled = false;
        alert("下载失败，请重试");
      });
    })
    .catch(error => {
      console.error("加载图片失败", error);
      document.body.removeChild(sandbox);
      
      // Restore button state
      downloadBtn.textContent = originalText;
      downloadBtn.disabled = false;
      alert("下载失败，请重试");
    });
}

// Handle comment form submission (placeholder functionality)
function setupCommentForm() {
  const submitBtn = document.querySelector('.submit-btn');
  const nameInput = document.getElementById('commenter-name');
  const contentInput = document.getElementById('comment-content');
  
  if (submitBtn && nameInput && contentInput) {
    submitBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      const content = contentInput.value.trim();
      
      if (!name) {
        alert('请输入您的名字');
        return;
      }
      
      if (!content) {
        alert('请输入评论内容');
        return;
      }
      
      // For now, just show an alert since we don't have backend storage
      alert('评论功能即将上线，敬请期待！');
      
      // Clear the form
      nameInput.value = '';
      contentInput.value = '';
    });
  }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  renderCardDetail();
  setupCommentForm();
});
