[![Netlify Status](https://api.netlify.com/api/v1/badges/4a2ba2a5-6271-4ab1-86ce-581643e5dcfe/deploy-status)](https://app.netlify.com/sites/inspiration-planet/deploys)

# 启发星球 ✨

启发星球是一个面向创作者与学习者的灵感社区应用，专注于「创建与分享启发卡片」与「组织活动与报名」。我们每周六早上都会举办线上分享会，交流过去一周的收获与思考，一起持续成长。

## 技术栈

- 前端：React + TypeScript + Vite
- UI：MUI（Material UI）
- 服务端：Netlify Functions（Node.js）
- 数据库：Supabase
- 包管理：Yarn Classic（1.x）
- Node 版本：建议使用 Node 20（本地与部署）

## 目录结构

```
./
├── index.html                 # Vite 应用入口
├── netlify.toml               # Netlify 本地开发与部署配置
├── package.json               # 项目依赖与脚本
├── vite.config.mjs            # Vite 配置（ESM）
├── src/                       # 现代前端应用（React + TS）
│   ├── App.tsx
│   ├── main.tsx
│   ├── routes/                # 路由入口
│   ├── pages/                 # 页面模块（activity/auth/card/...）
│   ├── components/            # 组件（Header/Footer 等）
│   ├── context/               # 全局状态/上下文
│   ├── database/              # Supabase 客户端
│   ├── hooks/                 # 自定义 hooks
│   ├── styles/                # 全局与页面样式
│   ├── utils/                 # 工具方法
│   └── netlify/               # 服务端相关定义
│       ├── configs/           # 函数配置（如权限、CORS 等）
│       ├── functions/         # Netlify 函数源码（TypeScript）
│       └── types/             # 函数类型与接口
├── public/                    # 静态资源与小工具
│   ├── images/                # 公共图片资源
│   ├── scripts/               # 独立脚本（如二维码生成）
│   └── tests/                 # 简单静态测试页
├── backup/                    # 旧版静态页面备份
│   ├── *.html, *.js, images/  # 过往版本页面与脚本
│   └── netlify/functions/     # 旧版函数示例（仅参考）
├── docs/                      # 历史文档与静态示例页
├── user_uploads/              # 本地开发时生成/上传的图片
└── yarn.lock                  # Yarn 锁文件
```

## Netlify 函数

项目使用 Netlify Functions 处理受保护的 API 请求（位于 `src/netlify/functions`）：

- `auth.ts` – 登录、注册、会话校验
- `cards.ts` – 卡片读取与更新（Supabase）
- `comments.ts` – 评论读取与提交
- `weeklyCards.ts` – 获取全部每周会议卡片
- `weeklyCardLatest.ts` – 获取最新一期会议卡片
- `searchImage.ts` – 基于 OpenRouter + Unsplash 搜图
- `uploadImage.ts` – 将生成图片保存到 GitHub
- `uploadCard.ts` – 批量/自动上传每周会议卡片（含自动配图）
- `meetup.ts` – 活动创建、列表、更新、删除
- `rsvp.ts` – 活动报名与状态管理
- `workshop.ts` – 工作坊报名接口

函数在本地开发时由 `netlify dev` 代理并与 Vite 一起运行：Vite 默认端口 `5173`，Netlify Dev 暴露在 `8888`。

## 环境变量

在项目根目录创建 `.env` 文件，包含以下变量（示例）：

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

提示：Netlify 本地开发会自动注入 `.env`、`netlify.toml` 以及站点后台配置中的环境变量。

## 本地开发

1. 克隆仓库

   ```bash
   git clone https://github.com/sunling/inspireplanet.cc
   cd inspireplanet.cc
   ```

2. 安装依赖（建议 Node 20 与 Yarn 1.x）

   ```bash
   # 使用 nvm 切换到 Node 20
   nvm use 20

   # 安装依赖
   yarn
   ```

3. 创建并填写 `.env`（参见上文「环境变量」）

4. 启动本地开发

   ```bash
   yarn dev
   ```

5. 打开浏览器访问 `http://localhost:8888`

## 构建与部署

- 部署平台：Netlify（生产环境 URL：`https://inspireplanet.cc/`）
- 开发：`yarn dev` 启动 Netlify Dev（代理函数与 Vite）
- 构建：`yarn build` 进行前端打包（如需）
- 部署：通过 Netlify 自动化部署（推送到主分支或使用 Netlify 控制台）

## 主要功能

- 个性化卡片创建：主题、字体、背景图片自定义
- 每周会议卡片展示：按剧集分组，支持最新卡片轮播
- 活动与报名（Meetups）：创建、列表、报名与管理
- 评论系统：卡片详情页读取与提交评论
- 搜图与配图：OpenRouter 生成搜索词 + Unsplash 获取图片
- 安全上传：通过 Netlify Functions 写入 Supabase 或保存到 GitHub
- 下载功能：导出高质量图片

## 注意事项

- 使用 Node 20 进行本地开发与部署（避免旧版 Node 与依赖不兼容）
- 若遇到包管理问题，优先使用 Yarn Classic（1.x）
- 目录中的 `backup/` 与 `docs/` 为历史版本与示例页面，仅供参考，不影响现代前端应用在 `src/` 下的开发与构建

## 贡献

欢迎贡献！如有建议或问题，请提交 Issue 或 Pull Request。

## 致谢

为启发星球 ✨ 用心打造。

作者：([Sun ling](https://sunling.github.io/)).

## 第三方工具

[react](https://zh-hans.react.dev/)
[组件库:material-ui](https://mui.com/material-ui/all-components/)
[时间处理:day.js](https://day.nodejs.cn/docs/en/installation/node-js)
