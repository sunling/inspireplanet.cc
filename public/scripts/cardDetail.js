// cardDetail.js - Handles dynamic loading and functionality for the card detail page

import {
  renderCard,
  getBaseUrl,
  processLongUrls
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

    const card = await fetchCardById(cardId);
    if (!card) {
      cardContainer.innerHTML = '<div class="error-message">未找到该卡片，可能已被删除或ID无效。</div>';
      downloadBtn.style.display = 'none';
      return;
    }

    // Prepare card data for rendering
    const detailText = sanitizeContent(card.Detail);
    marked.setOptions({
      breaks: true
    });
    const markedText = detailText ? marked.parse(detailText) : '';
    const processedDetail = processLongUrls(markedText);
    const normalizedCardData = {
      title: sanitizeContent(card.Title) || "默认标题",
      quote: sanitizeContent(card.Quote) || "默认金句",
      detail: processedDetail || "",
      imagePath: card.ImagePath || "",
      creator: sanitizeContent(card.Creator) || "匿名",
      font: card.Font || "'Noto Sans SC', sans-serif",
      gradientClass: card.GradientClass || 'card-gradient-1',
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

    // Check if user can edit this card and show edit button
    checkEditPermission(card);

    // Setup edit button
    const editBtn = document.getElementById('edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        window.location.href = `card-edit.html?id=${cardId}`;
      });
    }

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
  sandbox.style.background = "transparent";

  // Clone the card for capturing
  const clone = cardElement.cloneNode(true);
  clone.style.margin = "0";
  clone.style.width = "420px";
  clone.style.boxSizing = "border-box";
  
  // 确保渐变背景样式被正确应用
  const computedStyle = window.getComputedStyle(cardElement);
  clone.style.backgroundImage = computedStyle.backgroundImage;
  clone.style.backgroundColor = computedStyle.backgroundColor;
  
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
        backgroundColor: '#ffffff',
        imageTimeout: 10000,
        foreignObjectRendering: false,
        removeContainer: true,
        width: clone.offsetWidth,
        height: clone.offsetHeight
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

// Format date for comments
function formatCommentDate(dateString) {
  const date = new Date(dateString);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// Fetch comments for the current card
async function fetchComments(cardId) {
  try {
    const response = await fetch(`${getBaseUrl()}/.netlify/functions/commentsHandler?cardId=${encodeURIComponent(cardId)}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.comments || [];
  } catch (error) {
    console.error('获取评论失败:', error);
    return [];
  }
}

// Render comments in the comments section
function renderComments(comments) {
  const commentsSection = document.querySelector('.comments-section');
  const noCommentsElement = document.querySelector('.no-comments');

  if (!commentsSection) return;

  // Remove the "no comments" message if there are comments
  if (comments.length > 0 && noCommentsElement) {
    noCommentsElement.remove();
  }

  // Create a container for comments if it doesn't exist
  let commentsContainer = document.querySelector('.comments-container');
  if (!commentsContainer) {
    commentsContainer = document.createElement('div');
    commentsContainer.className = 'comments-container';

    // Insert before the comment form
    const commentForm = document.querySelector('.comment-form');
    if (commentForm) {
      commentsSection.insertBefore(commentsContainer, commentForm);
    } else {
      commentsSection.appendChild(commentsContainer);
    }
  }

  // Clear existing comments
  commentsContainer.innerHTML = '';

  // Add each comment
  comments.forEach(comment => {
    const commentElement = document.createElement('div');
    commentElement.className = 'comment';
    commentElement.innerHTML = `
      <div class="comment-header">
        <span class="comment-author">${sanitizeContent(comment.name)}</span>
        <span class="comment-date">${formatCommentDate(comment.created)}</span>
      </div>
      <div class="comment-body">
        ${sanitizeContent(comment.comment).replace(/\n/g, '<br>')}
      </div>
    `;
    commentsContainer.appendChild(commentElement);
  });

  // Show "no comments" message if there are no comments
  if (comments.length === 0 && !noCommentsElement) {
    const noComments = document.createElement('div');
    noComments.className = 'no-comments';
    noComments.textContent = '暂无评论';
    commentsSection.insertBefore(noComments, commentsContainer);
  }
}

// Handle comment form submission
function setupCommentForm() {
  const submitBtn = document.querySelector('.submit-btn');
  const nameInput = document.getElementById('commenter-name');
  const contentInput = document.getElementById('comment-content');

  if (submitBtn && nameInput && contentInput) {
    submitBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      const comment = contentInput.value.trim();
      const cardId = getCardIdFromUrl();

      if (!cardId) {
        alert('无法获取卡片ID，请刷新页面重试');
        return;
      }

      if (!name) {
        alert('请输入您的名字');
        return;
      }

      if (!comment) {
        alert('请输入评论内容');
        return;
      }

      // Disable button and show loading state
      const originalText = submitBtn.textContent;
      submitBtn.textContent = '提交中...';
      submitBtn.disabled = true;

      try {
        // Submit the comment
        const response = await fetch(`${getBaseUrl()}/.netlify/functions/commentsHandler`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            cardId,
            name,
            comment
          })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Clear the form
          nameInput.value = '';
          contentInput.value = '';

          // Refresh comments
          const comments = await fetchComments(cardId);
          renderComments(comments);

          // Show success message
          alert('评论提交成功！');
        } else {
          alert(`评论提交失败: ${result.error || '未知错误'}`);
        }
      } catch (error) {
        console.error('提交评论失败:', error);
        alert('评论提交失败，请稍后再试');
      } finally {
        // Restore button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }
}

function fetchCardById(cardId) {
  return fetch(`${getBaseUrl()}/.netlify/functions/cardsHandler?id=${cardId}`)
    .then(response => response.json())
    .then(data => data.records[0]);
}

// Check if current user can edit this card
function checkEditPermission(card) {
  const editBtn = document.getElementById('edit-btn');
  if (!editBtn) return;

  // Get current user information
  const user = localStorage.getItem('user');
  if (!user) {
    // User not logged in, hide edit button
    editBtn.style.display = 'none';
    return;
  }

  try {
    const userData = JSON.parse(user);
    const currentUsername = userData.username || '';
    const cardUsername = card.Username || '';

    // Show edit button only if current user is the card creator
    if (currentUsername && currentUsername === cardUsername) {
      editBtn.style.display = 'inline-block';
    } else {
      editBtn.style.display = 'none';
    }
  } catch (e) {
    console.error('解析用户信息失败:', e);
    editBtn.style.display = 'none';
  }
}

// Check login status and initialize edit button visibility
function checkLoginAndInitEditButton() {
  const editBtn = document.getElementById('edit-btn');
  if (!editBtn) return;

  // Get current user information
  const user = localStorage.getItem('user');
  if (!user) {
    // User not logged in, hide edit button
    editBtn.style.display = 'none';
    return false;
  }

  try {
    const userData = JSON.parse(user);
    const currentUsername = userData.name || '';
    
    if (!currentUsername) {
      editBtn.style.display = 'none';
      return false;
    }
    
    // User is logged in, but we still need to check card ownership later
    return true;
  } catch (e) {
    console.error('解析用户信息失败:', e);
    editBtn.style.display = 'none';
    return false;
  }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
  // Check login status first
  const isLoggedIn = checkLoginAndInitEditButton();
  
  await renderCardDetail();
  setupCommentForm();

  // Fetch and render comments for the current card
  const cardId = getCardIdFromUrl();
  if (cardId) {
    const comments = await fetchComments(cardId);
    renderComments(comments);
  }
});
