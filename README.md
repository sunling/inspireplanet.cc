[![Netlify Status](https://api.netlify.com/api/v1/badges/4a2ba2a5-6271-4ab1-86ce-581643e5dcfe/deploy-status)](https://app.netlify.com/sites/inspiration-planet/deploys)

# 启发星球闪卡 ✨

一个用于创建、上传和展示来自书籍、播客、电影及个人感悟的启发闪卡的网页应用。该项目让用户能够捕捉灵感瞬间，并以视觉吸引人的形式与他人分享。

## 项目概述

该网页应用允许用户创建精美的灵感卡片，支持自定义主题、字体和背景图片。用户可以通过网页界面单独创建卡片，或通过管理面板批量上传。所有卡片存储在 Supabase 数据库中，并按日期或剧集分组展示在网站上。

## 项目结构

```
/docs          # 旧版页面（如card-editor.html、cover-editor.html等）
/public        # 主生产站点
  ├── /admin   # 批量上传工具（bulk-uploader.html）
  ├── /images  # 卡片背景图片
  ├── /scripts # JavaScript文件（cardUtils.js、bulk-uploader.js等）
  ├── auth.html          # 登录页面
  ├── signup.html        # 注册页面
  ├── card-detail.html   # 查看单张卡片
  ├── cards.html         # 查看所有卡片
  ├── daily-card.html    # 日签卡片编辑器
  ├── index.html         # 主页（创建卡片 + 最新卡片轮播）
  ├── text-optimizer.html # 文本优化器
  ├── weekly-cards.html  # 查看每周会议卡片
  ├── cover-editor.html  # 制作横版封面
  ├── cover-editor-mobile.html  # 制作竖版封面
  images.json    # 卡片背景图片的定义列表
/public/netlify/functions # Netlify无服务器函数
  ├── authHandler.js
  ├── cardsHandler.js
  ├── commentsHandler.js
  ├── fetchWeeklyCards.js
  ├── optimizeText.js
  ├── searchImage.js
  ├── uploadImageToGitHub.js
  ├── uploadWeeklyCard.js
  ├── workshopHandler.js
  ├── utils.js
/user_uploads  # 用户上传的图片
```

## Netlify 函数

项目使用Netlify无服务器函数安全处理API请求：


- **authHandler.js** – 处理登录、注册和会话
- **cardsHandler.js** – 从 Supabase 获取卡片列表
- **commentsHandler.js** – 管理评论数据
- **fetchWeeklyCards.js** – 获取每周会议卡片
- **optimizeText.js** – 使用 AI 优化文本
- **searchImage.js** – 搜索合适的图片
- **uploadImageToGitHub.js** – 将图片保存到 GitHub
- **uploadWeeklyCard.js** – 批量上传每周卡片
- **workshopHandler.js** – 工作坊相关接口
## 主要功能


- **个性化卡片创建**：设计灵感卡片，支持自定义主题、字体和图片
- **文本优化器**：使用 AI 优化卡片文本
- **日签卡片编辑器**：快速创建每日卡片
- **用户登录与注册**：通过 Supabase 进行身份验证
- **安全上传**：所有卡片通过无服务器函数保存到 Supabase
- **有序展示**：按日期（所有卡片）或剧集（每周会议总结卡片）分组查看
- **下载功能**：直接从网站下载高质量图片格式的卡片
- **最新卡片轮播**：在主页浏览最近10张卡片
- **管理面板**：通过专用管理界面批量上传每周会议卡片
## 部署信息

- **托管服务**：Netlify
- **生产环境URL**：https://inspiration-planet.netlify.app
- **配置**：使用`.env`文件配置Supabase及其他API密钥

## 本地开发

本地搭建项目的步骤：

1. 克隆仓库
   ```
   git clone https://github.com/yourusername/content-crafter-kit.git
   cd content-crafter-kit
   ```

2. 安装依赖
   ```
   npm install
   ```

3. 创建`.env`文件，包含以下变量：
   ```
   SUPABASE_URL=Supabase 项目地址
   SUPABASE_ANON_KEY=Supabase 匿名密钥
   JWT_SECRET=JWT 加密密钥
   OPENROUTER_API_KEY=OpenRouter API 密钥
   UNSPLASH_ACCESS_KEY=Unsplash Access Key
   REPLICATE_API_TOKEN=Replicate API Token
   GITHUB_TOKEN=GitHub Token
   GITHUB_REPO_OWNER=GitHub 用户名
   GITHUB_REPO_NAME=仓库名
   GITHUB_BRANCH=main
   ```

4. 启动Netlify开发服务器
   ```
   npx netlify dev
   ```

5. 打开浏览器访问`http://localhost:8888`

## 未来改进

- 提升所有页面的移动端响应性
- 为卡片展示页面添加分页以优化性能
- 实现用户认证，支持个性化卡片收藏
- 增加搜索和筛选功能
- 创建卡片统计与分析仪表盘
- 允许用户收藏或书签卡片
- 实现社交分享功能

## 贡献

欢迎贡献！如有改进建议或发现任何问题，请随时提交issue或pull request。

## 致谢

为启发星球 ✨ 用心打造。

作者：([Sun ling](https://sunling.github.io/))。