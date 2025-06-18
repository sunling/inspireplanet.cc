# 分享工具模块 (shareUtils.js)

这是一个通用的卡片分享工具模块，提供微信分享和图片下载功能，可以在多个页面中复用。

## 功能特性

- 🔄 **通用性**: 可在多个页面中复用
- 📱 **微信分享**: 支持分享到微信朋友圈和好友
- 💾 **图片下载**: 支持将卡片导出为PNG图片
- 🌐 **环境适配**: 自动检测本地/生产环境
- 🎨 **高质量渲染**: 使用html2canvas生成高清图片

## 使用方法

### 1. 基础分享功能

```javascript
import { shareToWechat } from './scripts/shareUtils.js';

// 调用分享功能
await shareToWechat({
  cardElement: document.querySelector('.card'), // 要分享的卡片元素
  shareButton: document.querySelector('#share-btn'), // 分享按钮元素
  shareData: {
    title: '卡片标题',
    desc: '卡片描述',
    link: window.location.href
  },
  downloadFileName: 'my-card.png' // 可选，下载文件名
});
```

### 2. 初始化分享功能

```javascript
import { initShareFunction } from './scripts/shareUtils.js';

// 为页面初始化分享功能
initShareFunction({
  cardSelector: '.card', // 卡片选择器
  shareButtonSelector: '#share-btn', // 分享按钮选择器
  getShareData: function() {
    // 返回分享数据的函数
    return {
      title: '我的卡片',
      desc: '这是一个很棒的卡片',
      link: window.location.href
    };
  }
});
```

### 3. 初始化下载功能

```javascript
import { initDownloadFunction } from './scripts/shareUtils.js';

// 为页面初始化下载功能
initDownloadFunction({
  cardSelector: '.card', // 卡片选择器
  downloadButtonSelector: '#download-btn', // 下载按钮选择器
  getFileName: function() {
    // 可选，返回文件名的函数
    return `card-${new Date().getTime()}.png`;
  }
});
```

### 4. 简单下载功能

```javascript
import { downloadCard } from './scripts/shareUtils.js';

// 直接下载卡片
await downloadCard(
  document.querySelector('.card'), // 卡片元素
  'my-card.png' // 可选，文件名
);
```

## 在不同页面中的应用

### index.html (卡片创建页面)

```javascript
// 使用initShareFunction初始化
initShareFunction({
  cardSelector: '.card',
  shareButtonSelector: 'button[onclick="shareToWechat()"]',
  getShareData: function() {
    const title = document.getElementById('title').value || '我的启发时刻卡片';
    const quote = document.getElementById('quote').value || '分享一个触动我的观点';
    const creator = document.getElementById('creator').value || '匿名';
    
    return {
      title: `${title} - by ${creator}`,
      desc: quote.length > 50 ? quote.substring(0, 50) + '...' : quote,
      link: window.location.href
    };
  }
});
```

### card-detail.html (卡片详情页面)

```javascript
// 同时初始化分享和下载功能
initShareFunction({
  cardSelector: '.card',
  shareButtonSelector: '#share-btn',
  getShareData: function() {
    // 从DOM中提取卡片信息
    const titleElement = document.querySelector('.card .title');
    const quoteElement = document.querySelector('.card .quote');
    const creatorElement = document.querySelector('.card .creator');
    
    return {
      title: `${titleElement?.textContent} - by ${creatorElement?.textContent}`,
      desc: quoteElement?.textContent,
      link: window.location.href
    };
  }
});

initDownloadFunction({
  cardSelector: '.card',
  downloadButtonSelector: '#download-btn'
});
```

### cards.html (卡片列表页面)

```javascript
// 在appendCardToContainer中使用
appendCardToContainer(card, containerId, {
  addShareBtn: true, // 启用分享按钮
  makeClickable: true
});
```

## 环境适配

- **本地开发环境**: 自动下载图片到本地
- **生产环境**: 配置微信分享，支持分享到朋友圈和好友

## 依赖要求

- `html2canvas`: 用于生成卡片图片
- 微信JS SDK: 生产环境中自动加载

## 注意事项

1. 确保页面已引入 `html2canvas` 库
2. 分享按钮需要设置正确的选择器
3. 卡片元素需要有合适的样式以便截图
4. 微信分享需要在微信环境中才能正常工作

## API 参考

### shareToWechat(options)

主要的分享函数

**参数:**
- `options.cardElement` (HTMLElement): 要分享的卡片DOM元素
- `options.shareButton` (HTMLElement): 分享按钮元素
- `options.shareData` (Object): 分享数据
  - `title` (string): 分享标题
  - `desc` (string): 分享描述
  - `link` (string): 分享链接
- `options.downloadFileName` (string, 可选): 下载文件名

### initShareFunction(config)

初始化分享功能

**参数:**
- `config.cardSelector` (string): 卡片元素选择器
- `config.shareButtonSelector` (string): 分享按钮选择器
- `config.getShareData` (Function): 获取分享数据的函数

### initDownloadFunction(config)

初始化下载功能

**参数:**
- `config.cardSelector` (string): 卡片元素选择器
- `config.downloadButtonSelector` (string): 下载按钮选择器
- `config.getFileName` (Function, 可选): 获取文件名的函数

### downloadCard(cardElement, fileName)

简单的下载功能

**参数:**
- `cardElement` (HTMLElement): 要下载的卡片DOM元素
- `fileName` (string, 可选): 下载文件名