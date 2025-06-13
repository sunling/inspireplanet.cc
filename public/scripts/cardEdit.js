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

// Check if current user has permission to edit this card
function checkEditPermission(card) {
  const user = localStorage.getItem('user');
  if (!user) {
    showError('请先登录后再编辑卡片');
    setTimeout(() => {
      window.location.href = 'auth.html';
    }, 2000);
    return false;
  }

  try {
    const userData = JSON.parse(user);
    const currentUsername = userData.username || '';
    const cardUsername = card.Username || '';

    if (!currentUsername || currentUsername !== cardUsername) {
      showError('您没有权限编辑此卡片');
      setTimeout(() => {
        history.back();
      }, 2000);
      return false;
    }

    return true;
  } catch (e) {
    console.error('解析用户信息失败:', e);
    showError('用户信息验证失败');
    setTimeout(() => {
      window.location.href = 'auth.html';
    }, 2000);
    return false;
  }
}

// Show error message
function showError(message) {
  const errorElement = document.getElementById('error-message');
  const loadingElement = document.getElementById('loading');
  const formElement = document.getElementById('edit-form');
  
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
  
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }
  
  if (formElement) {
    formElement.style.display = 'none';
  }
}

// Fetch card data by ID
async function fetchCardById(cardId) {
  try {
    const response = await fetch(`${getBaseUrl()}/.netlify/functions/cardsHandler?id=${cardId}`);
    const data = await response.json();
    return data.records[0];
  } catch (error) {
    console.error('获取卡片数据失败:', error);
    return null;
  }
}

// Load available images for selection
async function loadImageOptions() {
  try {
    const response = await fetch('/images.json');
    const images = await response.json();
    const imageSelect = document.getElementById('image-select');
    
    if (imageSelect && images) {
      // Clear existing options except the first one
      imageSelect.innerHTML = '<option value="">无背景图片</option>';
      
      images.forEach(image => {
        const option = document.createElement('option');
        option.value = image.path;
        option.textContent = image.name;
        imageSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('加载图片选项失败:', error);
  }
}

// Populate form with card data
function populateForm(card) {
  document.getElementById('title').value = card.Title || '';
  document.getElementById('quote').value = card.Quote || '';
  document.getElementById('detail').value = card.Detail || '';
  document.getElementById('creator').value = card.Creator || '';
  document.getElementById('choose-gradient').value = card.GradientClass || 'card-gradient-1';
  document.getElementById('choose-font').value = card.Font || "'Noto Sans SC', sans-serif";
  document.getElementById('image-select').value = card.ImagePath || '';
}

// Update card preview
function updateCardPreview() {
  const previewContainer = document.getElementById('card-preview');
  if (!previewContainer) return;

  // Get form values
  const title = document.getElementById('title').value || '请填写标题';
  const quote = document.getElementById('quote').value || '请填写金句';
  const detail = document.getElementById('detail').value || '请填写启发详情';
  const creator = document.getElementById('creator').value || '匿名';
  const gradientClass = document.getElementById('choose-gradient').value;
  const font = document.getElementById('choose-font').value;
  const imagePath = document.getElementById('image-select').value;

  // Process detail text with markdown
  marked.setOptions({
    breaks: true
  });
  const parsedDetail = detail ? marked.parse(detail) : '';
  const processedDetail = processLongUrls(parsedDetail);

  // Create card data
  const cardData = {
    title,
    quote,
    detail: processedDetail,
    creator,
    font,
    gradientClass,
    imagePath,
    customImage: ''
  };

  // Clear and render preview
  previewContainer.innerHTML = '';
  const cardElement = renderCard(cardData, {
    mode: 'preview',
    cardId: 'preview-card',
    isMarkdown: true
  });
  previewContainer.appendChild(cardElement);
}

// Handle form submission
async function handleFormSubmit(event) {
  event.preventDefault();
  
  const cardId = getCardIdFromUrl();
  if (!cardId) {
    alert('无法获取卡片ID');
    return;
  }

  const submitBtn = event.target.querySelector('.primary-btn');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = '保存中...';
  submitBtn.disabled = true;

  try {
    // Get current user information
    let username = '';
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        username = userData.name || '';
      } catch (e) {
        console.error('解析用户信息失败:', e);
      }
    }

    // Prepare form data
    const formData = {
      id: cardId,
      gradientClass: document.getElementById('choose-gradient').value,
      font: document.getElementById('choose-font').value,
      title: document.getElementById('title').value,
      quote: document.getElementById('quote').value,
      imagePath: document.getElementById('image-select').value,
      detail: document.getElementById('detail').value,
      creator: document.getElementById('creator').value,
      username: username
    };

    // Submit update request
    const response = await fetch(`${getBaseUrl()}/.netlify/functions/cardsHandler`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert('卡片更新成功！');
      // Redirect back to card detail page
      window.location.href = `card-detail.html?id=${cardId}`;
    } else {
      alert(`更新失败: ${result.error || '未知错误'}`);
    }
  } catch (error) {
    console.error('更新卡片失败:', error);
    alert('更新失败，请稍后再试');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// Initialize the page
async function initializePage() {
  const cardId = getCardIdFromUrl();
  
  if (!cardId) {
    showError('未找到卡片ID，请返回卡片列表页面重试');
    return;
  }

  try {
    // Load card data
    const card = await fetchCardById(cardId);
    
    if (!card) {
      showError('未找到该卡片，可能已被删除或ID无效');
      return;
    }

    // Check edit permission
    if (!checkEditPermission(card)) {
      return;
    }

    // Load image options
    await loadImageOptions();

    // Populate form
    populateForm(card);

    // Show form and hide loading
    document.getElementById('loading').style.display = 'none';
    document.getElementById('edit-form').style.display = 'block';

    // Update initial preview
    updateCardPreview();

    // Setup form event listeners
    const form = document.getElementById('edit-form');
    form.addEventListener('submit', handleFormSubmit);

    // Setup preview update listeners
    const formInputs = form.querySelectorAll('input, textarea, select');
    formInputs.forEach(input => {
      input.addEventListener('input', updateCardPreview);
      input.addEventListener('change', updateCardPreview);
    });

  } catch (error) {
    console.error('初始化页面失败:', error);
    showError('页面加载失败，请稍后再试');
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);