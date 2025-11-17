[![Netlify Status](https://api.netlify.com/api/v1/badges/4a2ba2a5-6271-4ab1-86ce-581643e5dcfe/deploy-status)](https://app.netlify.com/sites/inspiration-planet/deploys)

# 启发星球 ✨

启发星球是一个面向创作者与学习者的灵感社区，这个应用专注于「创建与分享启发卡片」与「组织活动与报名」。我们每周六早上都会举办线上分享会，交流过去一周的收获与思考，一起持续成长。

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
  ├── weekly-cards.html  # 查看每周会议卡片
  ├── cover-editor.html  # 制作横版封面
  ├── cover-editor-mobile.html  # 制作竖版封面
  ├── create-meetup.html # 创建活动
  ├── meetups.html       # 活动列表与报名
  ├── meetup-detail.html # 活动详情
  ├── my-meetups.html    # 我创建的活动
  ├── act-signup.html    # 活动报名页（独立入口）
  images.json    # 卡片背景图片的定义列表
/public/netlify/functions # Netlify无服务器函数
  ├── authHandler.js
  ├── cardsHandler.js
  ├── commentsHandler.js
  ├── fetchWeeklyCards.js
  ├── getLatestWeeklyCards.js
  ├── meetupHandler.js
  ├── rsvpHandler.js
  ├── searchImage.js
  ├── uploadImageToGitHub.js
  ├── uploadWeeklyCard.js
  ├── workshopHandler.js
  ├── utils.js
/user_uploads  # 用户上传的图片
```

## Netlify 函数

项目使用 Netlify 无服务器函数安全处理 API 请求：

- **auth.ts** – 处理登录、注册、会话校验
- **cards.ts** – 读取与更新卡片数据（Supabase）
- **comments.ts** – 管理卡片评论（读取/提交）
- **weeklyCards.ts** – 获取全部每周会议卡片
- **weeklyCardLatest.ts** – 获取最新一期的会议卡片
- **searchImage.ts** – 基于 OpenRouter + Unsplash 搜图
- **uploadImage.ts** – 将生成的图片保存到 GitHub 仓库
- **uploadCard.ts** – 批量/自动上传每周会议卡片（含自动配图）
- **meetup.ts** – 活动创建、列表、更新、删除
- **rsvp.ts** – 活动报名与状态管理
- **workshop.ts** – 工作坊报名接口

## 主要功能

- **个性化卡片创建**：设计灵感卡片，支持自定义主题、字体和图片
- **日签卡片编辑器**：快速创建每日卡片
- **评论功能**：在卡片详情页面读取与提交评论
- **活动与报名（Meetups）**：创建活动、查看列表、报名参与、管理自己的活动
- **图片搜索与配图**：基于文本生成搜索词（OpenRouter），从 Unsplash 获取相关图片
- **安全上传**：卡片与活动数据通过无服务器函数保存到 Supabase
- **有序展示**：按日期（所有卡片）或剧集（每周会议总结卡片）分组查看
- **下载功能**：直接从网站下载高质量图片格式的卡片
- **最新卡片轮播**：在主页浏览最近 10 张卡片
- **批量上传**：通过管理面板批量上传每周会议卡片

## 部署信息

- **托管服务**：Netlify
- **生产环境 URL**：https://inspireplanet.cc/
- **配置**：使用`.env`文件配置 Supabase 及其他 API 密钥

## 本地开发

本地搭建项目的步骤：

1. 克隆仓库

   ```
   git clone https://github.com/sunling/inspireplanet.cc
   cd inspireplanet.cc
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

   GITHUB_TOKEN=GitHub Token
   GITHUB_REPO_OWNER=GitHub 用户名
   GITHUB_REPO_NAME=仓库名
   GITHUB_BRANCH=main
   ```

4. 启动 Netlify 开发服务器

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

欢迎贡献！如有改进建议或发现任何问题，请随时提交 issue 或 pull request。

## 致谢

为启发星球 ✨ 用心打造。

作者：([Sun ling](https://sunling.github.io/)).

## 第三方工具

[react](https://zh-hans.react.dev/)
[组件库](https://mui.com/material-ui/all-components/)
