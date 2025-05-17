// cardUtils.js - Combined utility module for card rendering, API interactions, and helper functions
/**
 * ===========================
 * 1. CARD RENDERING FUNCTIONS
 * ===========================
 */

// Theme definitions
const themes = {
  darkblue: {
    background: "#2f2f46",
    color: "#ffffff",
    quoteBg: "#fef6ec",
    quoteColor: "#ff7f2a",
  },
  green: {
    background: "#2e4a3f",
    color: "#f5f5dc",
    quoteBg: "#edf5ef",
    quoteColor: "#45715a",
  },
  brown: {
    background: "#4b3832",
    color: "#f5f5dc",
    quoteBg: "#f5e9dc",
    quoteColor: "#a0522d",
  },
  purple: {
    background: "#3e2f5b",
    color: "#f8e1f4",
    quoteBg: "#f9e7fd",
    quoteColor: "#9147b6",
  },
  grayblue: {
    background: "#2f3e46",
    color: "#ffffff",
    quoteBg: "#e0e0e0",
    quoteColor: "#1f2937",
  },
  morning: {
    background: "#fefaf3",
    color: "#5e4b2b",
    quoteBg: "#fff2da",
    quoteColor: "#d26a00",
  },
  mistyblue: {
    background: "#eef2f3",
    color: "#3c4a54",
    quoteBg: "#dceaf3",
    quoteColor: "#336699",
  },
  roseclay: {
    background: "#f8e8e0",
    color: "#5f3d42",
    quoteBg: "#ffece7",
    quoteColor: "#c06060",
  },
  creamMatcha: {
    background: "#f3f6ef",
    color: "#4a5a3c",
    quoteBg: "#e8f4df",
    quoteColor: "#5d7b4c",
  },
  lavenderMist: {
    background: "#f4f0f8",
    color: "#5a4c68",
    quoteBg: "#f2e8ff",
    quoteColor: "#9b5fb8",
  },
};

/**
 * Universal card rendering function
 * @param {Object} cardData - Card data
 * @param {string} cardData.title - Card title
 * @param {string} cardData.quote - Card quote
 * @param {string} cardData.detail - Card detail text
 * @param {string} cardData.imagePath - Path to the image
 * @param {string} cardData.creator - Card creator name
 * @param {string} cardData.font - Font family
 * @param {Object|string} cardData.theme - Theme colors
 * @param {string} cardData.customImage - Optional custom image (base64 or URL)
 * @param {Object} options - Rendering options
 * @param {string} options.mode - Rendering mode: 'editor', 'carousel', or 'list'
 * @param {string} options.cardId - Optional card ID
 * @returns {HTMLElement|string} - The rendered card element or HTML string
 */
export function renderCard(cardData, options = {}) {
  const {
    title = "这一刻，我想说...",
    quote = "请写下触动到你的观点或者你的启发",
    detail = "你怎么看呢？",
    imagePath = "",
    creator = "你的名字",
    font = "'Noto Sans SC', sans-serif",
    customImage = "",
    created = null,
    isMarkdown = false
  } = cardData;

  // Format the quote and detail text (replace newlines with <br>)
  const formattedQuote = typeof quote === 'string' ? quote.replace(/\n/g, '<br>') : quote;
  let formattedDetail = '';

  // Handle detail text - check if it's already parsed Markdown HTML
  if (isMarkdown) {
    // 直接使用Markdown解析后的HTML内容
    formattedDetail = detail;
  } else {
    // 非Markdown内容，简单替换换行符为<br>
    formattedDetail = typeof detail === 'string' ? detail.replace(/\n/g, '<br>') : detail;
  }

  // Use custom image if provided, otherwise use the image path
  const finalImage = customImage || imagePath;

  // Create date string
  const dateStr = formatToLocal(created);

  // Set card ID
  const cardId = options.cardId || `card-${Date.now()}`;

  // Mode-specific styles
  let modeStyles = '';
  if (options.mode === 'carousel') {
    // modeStyles = 'margin: 20px; max-width: 500px;'; // Add margin for carousel mode
  } else if (options.mode === 'list') {
    modeStyles = ''; // Any specific styles for list mode
  } else {
    modeStyles = ''; // Default for editor mode
  }

  let theme = cardData.theme;
  if (typeof theme === 'string') {
    theme = themes[cardData.theme];
  }

  // Create card HTML
  const cardHTML = `
    <div class="card" id="${cardId}" style="
          font-family: ${font};
          background-color: ${theme.background};
          color: ${theme.color};
          ${modeStyles}
        ">
         <div class="card-body">
          <div class="title">${title}</div>
          <div class="quote-box" style="
            background-color: ${theme.quoteBg}; 
            color: ${theme.quoteColor};
          ">${formattedQuote}</div>
          <img id="quote-image-${cardId}" src="${finalImage}" alt="金句插图" crossorigin="anonymous" />
          <div class="detail-text">${formattedDetail}</div>
        </div>
        <div class="card-footer">
            <div class="footer" style="color: ${theme.color}">——作者：${creator} · ${dateStr}</div>
        </div>
    </div>`;

  // For carousel and list modes, return the HTML string
  if (options.mode === 'editor') {
    return cardHTML;
  }

  // For carousel and list modes, create and return DOM element
  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = cardHTML.trim();
  return tempContainer.firstChild;
}

/**
 * Render a card for the editor preview
 * @param {Object} options - Card options
 * @param {string} cardId - Card ID
 * @returns {string} - The rendered card HTML
 */
export function renderEditorCard(options, cardId = "preview-card") {
  return renderCard(options, { mode: 'editor', cardId });
}

/**
 * Render a card for the carousel
 * @param {Object} cardData - Card data from Supabase
 * @param {number} index - Card index in the carousel
 * @returns {HTMLElement} - The rendered card wrapper element for Swiper
 */
export function renderCarouselCard(cardData, index) {
  // Create slide element
  const slide = document.createElement('div');
  slide.className = 'swiper-slide';

  // Create card wrapper
  const cardWrapper = document.createElement('div');
  cardWrapper.className = 'card-wrapper';

  // Prepare card data for rendering
  const normalizedCardData = {
    title: cardData.Title || "默认标题",
    quote: cardData.Quote || "默认金句",
    detail: cardData.Detail || "",
    imagePath: cardData.ImagePath || "",
    creator: cardData.Creator || "匿名",
    font: cardData.Font || "'Noto Sans SC', sans-serif",
    theme: cardData.Theme || themes.mistyblue,
    customImage: cardData.Upload || "",
    created: cardData.Created
  };

  // Create card element using universal renderCard function
  const cardId = `carousel-card-${index}`;
  const cardElement = renderCard(normalizedCardData, { mode: 'carousel', cardId });

  // make it clickable

  // Assemble elements
  cardWrapper.appendChild(cardElement);
  // cardWrapper.appendChild(downloadBtn);
  slide.appendChild(cardWrapper);

  return slide;
}

/**
 * Append a card to a container
 * @param {Object} cardData - Card data
 * @param {string} containerId - ID of the container element
 * @param {Object} options - Additional options
 * @param {string} options.imgPrefix - Prefix for image paths
 * @param {boolean} options.addDownloadBtn - Whether to add a download button
 * @param {string} options.cardIdPrefix - Prefix for card ID
 * @param {boolean} options.makeClickable - Whether to make the card clickable to detail page
 * @returns {HTMLElement|null} - The appended card element or null if container not found
 */
export function appendCardToContainer(cardData, containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return null;
  const {
    imgPrefix = '',
    addDownloadBtn = false,
    cardIdPrefix = '',
    makeClickable = false,
    showCommentForm = false
  } = options;

  // Generate a unique card ID
  const uniqueCardId = cardIdPrefix
    ? `${cardIdPrefix}-${cardData.id || Date.now()}`
    : cardData.id || `card-${Date.now()}`;

  // Prepare card data for rendering
  const normalizedCardData = {
    title: cardData.Title || "这一刻，我想说",
    quote: cardData.Quote || "",
    detail: cardData.Detail || "",
    imagePath: `${imgPrefix}${cardData.ImagePath}`,
    creator: cardData.Creator || "匿名",
    font: cardData.Font || "'Noto Sans SC', sans-serif",
    theme: cardData.Theme || themes.mistyblue,
    customImage: cardData.Upload || "",
    created: cardData.Created
  };

  // Create card element using universal renderCard function
  const cardElement = renderCard(normalizedCardData, { mode: 'list', cardId: uniqueCardId });

  // Create a wrapper for the card
  const cardWrapper = document.createElement('div');
  cardWrapper.className = 'card-container';
  cardWrapper.appendChild(cardElement);

  // Add download button if requested
  if (addDownloadBtn) {
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn';
    downloadBtn.innerHTML = '下载';
    downloadBtn.onclick = function (e) {
      e.stopPropagation(); // Prevent event bubbling
      downloadCard(`#${uniqueCardId}`);
    };
    cardWrapper.appendChild(downloadBtn);
  }

  // Create hover overlay with View Details button and Comment form
  if (makeClickable && cardData.id) {
    cardElement.style.cursor = 'pointer';
    cardElement.addEventListener('click', () => {
      window.location.href = `card-detail.html?id=${cardData.id}`;
    });

    cardElement.addEventListener('click', (e) => {
      // Check if we're on mobile
      if (window.innerWidth <= 768) {
        e.preventDefault();
        e.stopPropagation();
        hoverOverlay.classList.add('card-mobile-expand');
      } else if (makeClickable) {
        window.location.href = `card-detail.html?id=${cardData.id}`;
      }
    });
  }

  // Append to container
  container.appendChild(cardWrapper);

  return cardElement;
}

/**
 * Submit a comment for a card
 * @param {string} cardId - The ID of the card
 * @param {string} uniqueCardId - The unique ID of the card element
 */
async function submitComment(cardId, uniqueCardId) {
  const nameInput = document.getElementById(`name-${uniqueCardId}`);
  const commentTextarea = document.getElementById(`comment-${uniqueCardId}`);
  const successMsg = document.getElementById(`success-${uniqueCardId}`);
  const submitBtn = nameInput.nextElementSibling.nextElementSibling;
  const hoverOverlay = document.getElementById(`overlay-${uniqueCardId}`);

  if (!nameInput || !commentTextarea || !successMsg) return;

  const name = nameInput.value.trim();
  const comment = commentTextarea.value.trim();

  // Validate inputs
  if (!name) {
    alert('请输入您的名字');
    return;
  }

  if (!comment) {
    alert('请输入评论内容');
    return;
  }

  // Sanitize inputs
  const sanitizedName = sanitizeInput(name, 100);
  const sanitizedComment = sanitizeInput(comment, 500);

  // Show loading state
  const originalBtnText = submitBtn.textContent;
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
        name: sanitizedName,
        comment: sanitizedComment
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // Clear the form
      nameInput.value = '';
      commentTextarea.value = '';

      // Show success message
      successMsg.style.display = 'block';

      // Create and display the temporary comment preview
      const commentPreview = document.createElement('div');
      commentPreview.className = 'comment-preview';
      commentPreview.innerHTML = `
        <div class="comment-preview-content">
          <strong>${sanitizedName}</strong>: ${sanitizedComment}
        </div>
      `;

      // Add the comment preview to the card container
      const cardContainer = hoverOverlay.parentElement;
      cardContainer.appendChild(commentPreview);

      // Hide the hover overlay
      if (window.innerWidth <= 768) {
        hoverOverlay.classList.remove('card-mobile-expand');
      }

      // Remove the comment preview and success message after a delay
      setTimeout(() => {
        successMsg.style.display = 'none';
        if (cardContainer.contains(commentPreview)) {
          cardContainer.removeChild(commentPreview);
        }
      }, 5000);
    } else {
      alert(`评论提交失败: ${result.error || '未知错误'}`);
    }
  } catch (error) {
    console.error('提交评论失败:', error);
    alert('评论提交失败，请稍后再试');
  } finally {
    // Restore button state
    submitBtn.textContent = originalBtnText;
    submitBtn.disabled = false;
  }
}

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - The input string to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} - Sanitized string
 */
function sanitizeInput(input, maxLength) {
  if (!input) return '';

  // Trim leading/trailing spaces
  let sanitized = input.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Escape HTML special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return sanitized;
}

/**
 * Format a date string to "YYYY年MM月DD日" format without time
 * @param {string} dateString - Date string to format
 * @returns {string} - Formatted date string
 */
export function formatDateShort(dateString) {
  const date = new Date(dateString);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * Group cards by date
 * @param {Array} cards - Array of card data
 * @returns {Object} - Object with dates as keys and arrays of cards as values
 */
export function groupCardsByDate(cards) {
  const grouped = {};

  cards.forEach(card => {
    if (!card.Created) return;

    const dateKey = formatDateShort(card.Created);

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }

    grouped[dateKey].push(card);
  });

  return grouped;
}

/**
 * Group cards by Episode
 * @param {Array} cards - Array of card data
 * @returns {Object} - Object with episodes as keys and arrays of cards as values
 */
export function groupCardsByEpisode(cards) {
  const grouped = {};

  cards.forEach(card => {
    if (!card.Episode) return;

    const episodeKey = card.Episode;

    if (!grouped[episodeKey]) {
      grouped[episodeKey] = [];
    }

    grouped[episodeKey].push(card);
  });

  return grouped;
}

/**
 * Load and render all cards to a container, grouped by date
 * @param {string} containerId - ID of the container element
 * @param {boolean} makeClickable - Whether to make cards clickable to detail page
 * @returns {Promise<void>}
 */
export async function fetchAndRenderAllCards(containerId, makeClickable = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    // Show loading indicator
    container.innerHTML = '<div class="loading-indicator">加载中...</div>';

    const cards = await fetchCards();

    if (!Array.isArray(cards) || cards.length === 0) {
      container.innerHTML = '<div class="loading-indicator">暂无卡片数据</div>';
      return;
    }

    const safeCards = cards
      .map(card => sanitizeAndValidateCard(card, ['Font', 'Title', 'Quote', 'Detail', 'ImagePath', 'Creator']))
      .filter(result => result.isValid)
      .map(result => result.sanitizedCard);

    // Clear container
    container.innerHTML = '';

    // Group cards by date
    const groupedCards = groupCardsByDate(safeCards);

    // Sort dates in descending order (newest first)
    const sortedDates = Object.keys(groupedCards).sort((a, b) => {
      return new Date(b.replace(/年|月|日/g, '/')) - new Date(a.replace(/年|月|日/g, '/'));
    });

    const DOMPurify = window.DOMPurify;

    // Render cards by date groups
    sortedDates.forEach(date => {
      // Safely process date label
      const safeDate = isSafeString(date) ? DOMPurify.sanitize(date) : '未知日期';

      // Create date heading
      const dateHeading = document.createElement('h2');
      dateHeading.className = 'date-heading';
      dateHeading.textContent = safeDate;
      container.appendChild(dateHeading);

      // Create cards container for this date
      const dateContainer = document.createElement('div');
      dateContainer.className = 'date-cards-container';
      dateContainer.id = `date-container-${safeDate.replace(/[年月日]/g, '-')}`;
      container.appendChild(dateContainer);

      // Render cards for this date, with validation
      groupedCards[date].forEach(card => {
        appendCardToContainer(card, dateContainer.id, {
          imgPrefix: '../',
          makeClickable: makeClickable,
          showCommentForm: true,
          isMarkdown: true
        });
      });
    });
  } catch (error) {
    console.error('加载卡片失败:', error);
    container.innerHTML = '<div class="empty-message">加载失败，请稍后再试</div>';
  }
}

/**
 * Get a random item from an array
 * @param {Array} array - Array to get random item from
 * @returns {*} - Random item from array
 */
export function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Load and render weekly cards to a container, grouped by episode
 * @param {string} containerId - ID of the container element
 * @returns {Promise<void>}
 */
export async function fetchAndRenderWeeklyCards(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    // Show loading indicator
    container.innerHTML = '<div class="loading-indicator">加载中...</div>';

    const cards = await fetchWeeklyCards();

    if (!cards || cards.length === 0) {
      container.innerHTML = '<div class="empty-message">暂无每周会议卡片数据</div>';
      return;
    }

    // Clear container
    container.innerHTML = '';

    // 
    const weeklyCards = cards.map((card) => { return { ...card, Creator: `启发星球${card.Episode}` }; });
    // Group cards by episode
    const groupedCards = groupCardsByEpisode(weeklyCards);

    // Sort episodes in descending order (newest first)
    const sortedEpisodes = Object.keys(groupedCards).sort((a, b) => {
      // Extract episode numbers (e.g., "EP13" -> 13)
      const numA = parseInt(a.replace(/\D/g, ''));
      const numB = parseInt(b.replace(/\D/g, ''));
      return numB - numA; // Descending order
    });

    // Load available images
    let availableImages = [];
    try {
      const response = await fetch('images.json');
      availableImages = await response.json();
    } catch (error) {
      console.error('加载图片列表失败:', error);
      availableImages = [{ file: 'biking.png' }]; // Fallback
    }

    // Available themes (keys from the themes object)
    const availableThemes = Object.keys(themes);

    // Render cards by episode groups
    sortedEpisodes.forEach(episode => {
      // Create episode heading
      const episodeHeading = document.createElement('h2');
      episodeHeading.className = 'date-heading';
      episodeHeading.textContent = `2025${episode}`;
      episodeHeading.id = `episode-${episode.toLowerCase()}`;
      container.appendChild(episodeHeading);

      // Create cards container for this episode
      const episodeContainer = document.createElement('div');
      episodeContainer.className = 'date-cards-container';
      episodeContainer.id = `episode-container-${episode.toLowerCase()}`;
      container.appendChild(episodeContainer);

      // Sort cards by Created date (ascending)
      const sortedCards = groupedCards[episode].sort((a, b) => {
        return new Date(a.Created) - new Date(b.Created);
      });

      // Render cards for this episode with random styling
      sortedCards.forEach((card, index) => {
        // Randomly assign theme, font, and image for each card
        const randomTheme = getRandomItem(availableThemes);
        // const randomFont = getRandomItem(availableFonts);
        const randomFont = "'Noto Sans SC', sans-serif";
        const randomImage = getRandomItem(availableImages);

        // Prepare card data with random styling
        const styledCard = {
          ...card,
          Theme: randomTheme,
          Font: randomFont,
          ImagePath: `images/${randomImage.file}`
        };

        // Append card to container with download button and unique ID
        appendCardToContainer(styledCard, episodeContainer.id, {
          addDownloadBtn: true,
          cardIdPrefix: `weekly-card-${episode.toLowerCase()}-${index}`
        });
      });
    });
  } catch (error) {
    console.error('加载每周会议卡片失败:', error);
    container.innerHTML = '<div class="empty-message">加载失败，请稍后再试</div>';
  }
}

/**
 * ==========================
 * 2. API INTERACTION FUNCTIONS
 * ==========================
 */

export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  } else if (process && process.env && process.env.URL) {
    return process.env.URL;
  } else {
    return 'http://localhost:8888'; // fallback for local dev
  }
}

const BASE_URL = window.location.origin;
// API endpoints for Netlify functions
export const API_ENDPOINTS = {
  UPLOAD_CARD: `.netlify/functions/uploadCard`,
  UPLOAD_IMAGE: `.netlify/functions/uploadImageToGitHub`,
  CARDS_HANDLER: `.netlify/functions/cardsHandler`,
  FETCH_WEEKLY_CARDS: `.netlify/functions/fetchWeeklyCards`,
};

/**
 * Upload a card to Airtable
 * @param {Object} cardData - Card data to upload
 * @param {Object} cardData.theme - Theme colors
 * @param {string} cardData.font - Font family
 * @param {string} cardData.title - Card title
 * @param {string} cardData.quote - Card quote
 * @param {string} cardData.imagePath - Path to the image
 * @param {string} cardData.detail - Card detail text
 * @param {string} cardData.creator - Card creator name
 * @param {string} cardData.upload - Optional custom image (base64)
 * @returns {Promise<Object|null>} - Response data or null if failed
 */
export async function uploadCard(cardData) {
  if (!validateCard({
    title: cardData.title,
    quote: cardData.quote,
    detail: cardData.detail
  })) {
    return null;
  }

  // If there's a custom image, upload it to GitHub first
  let customImageUrl = null;
  if (cardData.upload) {
    try {
      // Show uploading indicator
      const submitBtn = document.querySelector('.primary-btn');
      const originalText = submitBtn.innerHTML;
      if (submitBtn) {
        submitBtn.innerHTML = '上传图片中...';
        submitBtn.disabled = true;
      }

      customImageUrl = await uploadImageToGitHub(cardData.upload);

      const res = await fetch('/.netlify/functions/analyzeImage', {
        method: 'POST',
        body: JSON.stringify({ imageUrl: customImageUrl }),
      });
      const result = await res.json();
      console.log('Suggested tags:', result.tags);


      // Restore button state
      if (submitBtn) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }

      if (!customImageUrl) {
        alert('图片上传失败，请重试或选择内置图片');
        return null;
      }
    } catch (error) {
      console.error('上传图片时出错:', error);
      alert('图片上传失败，请重试或选择内置图片');
      return null;
    }
  }

  // Show submitting indicator
  const submitBtn = document.querySelector('.primary-btn');
  let originalText = '';
  if (submitBtn) {
    originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '提交中...';
    submitBtn.disabled = true;
  }

  try {
    // Call Netlify function to upload card
    const response = await fetch(`${getBaseUrl()}/${API_ENDPOINTS.CARDS_HANDLER}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        theme: cardData.theme,
        font: cardData.font,
        title: cardData.title,
        quote: cardData.quote,
        imagePath: cardData.imagePath,
        detail: cardData.detail,
        upload: customImageUrl || '',
        creator: cardData.creator
      })
    });

    const result = await response.json();

    // Restore button state
    if (submitBtn) {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }

    if (response.ok && result.success) {
      // Refresh the card list after successful submission
      await fetch(`${getBaseUrl()}/${API_ENDPOINTS.CARDS_HANDLER}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      alert("🎉 提交成功!");
      return result;
    } else if (response.status === 409) {
      console.log("❗️这张卡片已存在，跳过重复提交 ✅");
      return result;
    } else {
      alert('提交失败，请检查控制台错误信息 ❌');
      console.error('提交失败:', result);
      return null;
    }
  } catch (error) {
    // Restore button state
    if (submitBtn) {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }

    console.error('提交过程中出错:', error);
    alert('提交失败，请检查网络连接 ❌');
    return null;
  }
}

/**
 * Fetch cards from Supabase
 * @returns {Promise<Array>} - Array of card data
 */
export async function fetchCards() {
  try {
    // Call Netlify function to get cards
    const response = await fetch(`${getBaseUrl()}/${API_ENDPOINTS.CARDS_HANDLER}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.records;
  } catch (error) {
    console.error("❌ 读取失败:", error);
    return [];
  }
}

/**
 * Fetch weekly cards from Supabase
 * @returns {Promise<Array>} - Array of card data
 */
export async function fetchWeeklyCards() {
  try {
    // Call Netlify function to get cards with weekly table name
    const response = await fetch(`${BASE_URL}/${API_ENDPOINTS.FETCH_WEEKLY_CARDS}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.records;
  } catch (error) {
    console.error("❌ 读取每周会议记录失败:", error);
    return [];
  }
}

/**
 * Upload an image to GitHub
 * @param {string} base64Image - Base64 encoded image data
 * @returns {Promise<string|null>} - URL of the uploaded image or null if failed
 */
export async function uploadImageToGitHub(base64Image) {
  try {
    // Call Netlify function to upload image
    const response = await fetch(`${getBaseUrl()}/${API_ENDPOINTS.UPLOAD_IMAGE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base64Image: base64Image
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ 图片上传成功:', data.url);
      return data.url;
    } else {
      console.error('❌ 图片上传失败:', data.error || '未知错误');
      return null;
    }
  } catch (error) {
    console.error('❌ 图片上传过程中出错:', error);
    return null;
  }
}

/**
 * ==========================
 * 3. HELPER FUNCTIONS
 * ==========================
 */

/**
 * Format a date string to "YYYY年M月D日" format
 * @param {string} dateString - Date string to format
 * @returns {string} - Formatted date string
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Download a card
 * @param {string} selector - Selector for the card element
 * @param {string} filenamePrefix - Prefix for the downloaded file name
 */
export function downloadCard(selector = "#preview-card", filenamePrefix = "inspiration-card-") {
  const cardElement = document.querySelector(selector);

  if (!cardElement) {
    console.warn(`元素 ${selector} 不存在`);
    return;
  }

  // Show loading indicator if there's a download button
  let downloadBtn = null;
  if (selector.startsWith('#carousel-card-')) {
    const index = selector.replace('#carousel-card-', '');
    downloadBtn = document.querySelector(`[data-index="carousel-card-${index}"]`);
  } else {
    downloadBtn = document.querySelector('.download-btn');
  }

  let originalText = '';
  if (downloadBtn) {
    originalText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = '下载中...';
    setTimeout(() => {
      if (downloadBtn.innerHTML === '下载中...') {
        downloadBtn.innerHTML = originalText;
      }
    }, 10000);
  }

  // Create a sandbox container
  const sandbox = document.createElement("div");
  sandbox.style.position = "fixed";
  sandbox.style.left = "-9999px";
  sandbox.style.top = "0";
  sandbox.style.zIndex = "-1";
  sandbox.style.background = "white";


  const clone = cardElement.cloneNode(true);
  clone.style.margin = "0";
  clone.style.width = "420px";
  clone.style.boxSizing = "border-box";
  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  // Make sure all images are fully loaded inside the clone
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

      // Timeout fallback (in case onload/onerror is never fired)
      setTimeout(resolve, 5000);
    });
  });



  Promise.all(imagePromises)
    .then(() => new Promise(resolve => setTimeout(resolve, 200))) // extra small delay
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
          const link = document.createElement('a');
          link.download = `${filenamePrefix}${Date.now()}.png`;
          link.href = URL.createObjectURL(blob);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          document.body.removeChild(sandbox);

          if (downloadBtn) {
            downloadBtn.innerHTML = originalText || '下载';
          }
        }, "image/png");
      }).catch(err => {
        console.error("截图失败", err);
        document.body.removeChild(sandbox);

        if (downloadBtn) {
          downloadBtn.innerHTML = originalText || '下载';
        }
        alert("下载失败，请重试");
      });
    })
    .catch(error => {
      console.error("加载图片失败", error);
      // Try to continue download anyway
      captureAnyway();
    });

  function captureAnyway() {
    html2canvas(clone, {
      scale: 3,
      logging: false,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      imageTimeout: 5000,
    }).then(canvas => {
      canvas.toBlob(blob => {
        const link = document.createElement('a');
        link.download = `${filenamePrefix}${Date.now()}.png`;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        document.body.removeChild(sandbox);

        if (downloadBtn) {
          downloadBtn.innerHTML = originalText || '下载';
        }
      }, "image/png");
    });
  }
}

/**
 * 下载指定元素生成的卡片截图
 * @param {string} elementId - 要截图的元素 id（默认是 "preview"）
 * @param {string} filenamePrefix - 下载文件名前缀（默认是 "inspiration-card"）
 */
export function downloadCover(elementId = ".cover", filenamePrefix = "cover") {
  const cardElement = document.querySelector(elementId);
  if (!cardElement) {
    console.warn(`元素 #${elementId} 不存在`);
    return;
  }
  setTimeout(() => {
    html2canvas(cardElement, {
      scale: 3, // 高清导出
      logging: true,
      useCORS: true,
      backgroundColor: null,
    }).then(canvas => {
      canvas.toBlob(function (blob) {
        const link = document.createElement('a');
        link.download = `${filenamePrefix}-${Date.now()}.png`;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        document.body.removeChild(sandbox);
      }, "image/png");
    }).catch(err => {
      console.log("截图失败", err);
    }, 500);
  });
}

/**
 * Load images and populate a select element
 * @param {Function} onLoadedFunc - Callback function
 * @param {string} selectId - ID of the select element
 * @param {string} jsonPath - Path to the JSON file with image data
 */
export function loadImages(onLoadedFunc, selectId = "image-select", jsonPath = "images.json") {
  fetch(jsonPath)
    .then(res => res.json())
    .then(imageGroups => {
      const select = document.getElementById(selectId);
      if (!select) return;

      // Clear existing options
      select.innerHTML = '';

      // Add all image options (have't used the tags yet)
      Object.values(imageGroups).flat().forEach(img => {
        const option = new Option(img.desc, `images/${img.file}`);
        select.add(option);
      });

      // Randomly select one from the list
      select.value = getRandomItem(select.options).value;

      if (typeof onLoadedFunc === "function") onLoadedFunc();
    })
    .catch(e => {
      console.error("加载背景图失败:", e);
      const select = document.getElementById(selectId);
      if (select) {
        select.innerHTML = `
          <option value="images/biking.png">默认背景</option>
        `;
      }
    });
}

/**
 * Handle image upload
 * @param {Event} event - Upload event
 * @param {Function} callBackFunc - Callback function with the image data
 * @param {string} previewLabelId - ID of the element to show upload status
 */
export function onUploadBg(event, callBackFunc, previewLabelId = "fileStatus") {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    if (typeof callBackFunc === "function") callBackFunc(e.target.result);

    // Update upload status
    if (previewLabelId) {
      const label = document.getElementById(previewLabelId);
      if (label) label.textContent = `已上传：${file.name}`;
    }

    // Reset input
    event.target.value = '';
  };

  reader.readAsDataURL(file);
}

/**
 * Bind a custom file upload button
 * @param {Object} config - Configuration object
 * @param {string} config.inputId - ID of the file input element
 * @param {string} config.buttonId - ID of the custom button element
 * @param {string} config.statusId - ID of the status display element
 * @param {Function} config.onLoad - Callback function with the image data
 */
export function bindCustomFileUpload({ inputId, buttonId, statusId, onLoad }) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  const status = document.getElementById(statusId);

  if (!input || !button || !status) {
    console.warn("自定义上传绑定失败：元素未找到");
    return;
  }

  // Click button to trigger hidden input
  button.addEventListener("click", () => input.click());

  // Handle upload
  input.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      onLoad(e.target.result);
      status.textContent = "已上传：" + file.name;
      event.target.value = ''; // Clear value to support repeated uploads
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Create a hash for a card
 * @param {Object} card - Card data
 * @returns {string|null} - Hash string or null if invalid card
 */
export function hashCard(card) {
  if (!card.title || !card.quote || !card.detail) return null;

  const normalized = [
    card.title.trim().replace(/\s+/g, ' '),
    card.quote.trim().replace(/\s+/g, ' '),
    card.detail.trim().replace(/\s+/g, ' ')
  ].join('|');

  const encoded = new TextEncoder().encode(normalized);
  return btoa(String.fromCharCode(...encoded));
}

/**
 * Validate card data
 * @param {Object} cardData - Card data to validate
 * @param {string} cardData.title - Card title
 * @param {string} cardData.quote - Card quote
 * @param {string} cardData.detail - Card detail text
 * @returns {boolean} - True if valid, false otherwise
 */
export function validateCard({ title, quote, detail }) {
  const containsHTML = str => /<[^>]+>/.test(str); // 检测是否包含 HTML 标签

  const isMeaningful = str => {
    if (!str) return false;
    const trimmed = str.trim();
    const hasLetters = /[A-Za-z\u4e00-\u9fff]/.test(trimmed); // 检测至少有字母或汉字
    return (
      trimmed.length >= 5 &&
      hasLetters &&
      !/(.)\1{4,}/.test(trimmed)
    );
  };

  if (!title || title.trim().length < 2) {
    alert("请填写有效的标题（至少2个字吧）");
    return false;
  }
  if (containsHTML(title)) {
    alert("标题中不能包含HTML标签");
    return false;
  }

  if (!quote || quote.trim().length < 5) {
    alert("请填写`被触动的观点`（至少5个字吧）");
    return false;
  }
  if (containsHTML(quote)) {
    alert("观点中不能包含HTML标签");
    return false;
  }

  if (!detail || detail.length < 10 || !isMeaningful(detail)) {
    alert("请填写启发内容（至少10个字吧，不能全是标点或无效字符）");
    return false;
  }
  if (containsHTML(detail)) {
    alert("启发内容中不能包含HTML标签");
    return false;
  }

  return true;
}

function formatToLocal(datetimeStr) {
  if (!datetimeStr) return formatToLocal(new Date().toISOString());

  let date;
  if (typeof datetimeStr === 'string') {
    // Normalize: replace space with 'T' and append 'Z' to ensure UTC
    const normalizedStr = datetimeStr.includes('T')
      ? datetimeStr.endsWith('Z') ? datetimeStr : datetimeStr + 'Z'
      : datetimeStr.replace(' ', 'T') + 'Z';

    date = new Date(normalizedStr);
  } else {
    date = new Date(datetimeStr);
  }

  const pad = (n) => n.toString().padStart(2, '0');

  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const min = pad(date.getMinutes());

  return `${yyyy}-${mm}-${dd} ${HH}:${min}`;
}


/**
 * Safely checks if a value is a non-empty string
 * @param {any} value
 * @returns {boolean}
 */
function isSafeString(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length < 1000;
}
/**
 * 检查输入是否包含被净化掉的内容（前后不同 = 有危险）
 * @param {string} raw
 * @returns {boolean}
 */
function hasDangerousContent(raw) {
  const forbiddenTagRegex = /<(script|iframe|svg|img)[^>]*>/i;
  const forbiddenAttrRegex = /onerror\s*=|onclick\s*=|onload\s*=/i;

  return forbiddenTagRegex.test(raw) || forbiddenAttrRegex.test(raw);
}

/**
 * 清理并检测 card
 * @param {object} card
 * @param {string[]} fields
 * @returns {object} { sanitizedCard, isValid }
 */
export function sanitizeAndValidateCard(card, fields = ['Font', 'Title', 'Quote', 'Detail', 'ImagePath', 'Creator']) {
  if (typeof card !== 'object' || card === null) {
    console.warn('sanitizeCard received non-object:', card);
    return { sanitizedCard: {}, isValid: false };
  }

  const sanitizedCard = { ...card };
  let isValid = true;

  fields.forEach(field => {
    if (field in card) {
      const raw = String(card[field] ?? '');

      if (hasDangerousContent(raw)) {
        console.warn(`⚠️ Blocked card due to dangerous content in ${field}:`, raw);
        isValid = false;
      }

      sanitizedCard[field] = sanitizeField(raw);
    }
  });

  return { sanitizedCard, isValid };
}

/**
 * 字段清理函数
 * @param {any} input
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeField(input, maxLength = 1000) {
  if (typeof input !== 'string') {
    input = String(input ?? '');
  }

  let trimmed = input.trim();

  if (trimmed.length > maxLength) {
    trimmed = trimmed.slice(0, maxLength) + '...';
  }

  const DOMPurify = window.DOMPurify;
  return DOMPurify.sanitize(trimmed, {
    FORBID_ATTR: ['onerror', 'onclick', 'onload'],
    FORBID_TAGS: ['svg', 'iframe']
  });
}

/**
 * Filter cards based on search term
 * @param {Array} cards - Array of card data
 * @param {string} searchTerm - Search term to filter by
 * @returns {Array} - Filtered array of cards
 */
export function filterCardsBySearchTerm(cards, searchTerm) {
  if (!searchTerm || searchTerm.trim() === '') {
    return cards;
  }

  const term = searchTerm.trim().toLowerCase();

  return cards.filter(card => {
    const title = (card.Title || '').toLowerCase();
    const quote = (card.Quote || '').toLowerCase();
    const detail = (card.Detail || '').toLowerCase();

    return title.includes(term) || quote.includes(term) || detail.includes(term);
  });
}

// Export themes for external use
export { themes };
