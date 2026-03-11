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

复制模板文件并填入对应的值：

```bash
cp .env.example .env
```

`.env` 中需要配置变量：

**服务端变量（无前缀，Netlify Functions 运行时注入）**

| 变量名                      | 说明                                             |
| --------------------------- | ------------------------------------------------ |
| `URL`                       | 本地开发填 `http://localhost:8888`               |
| `SUPABASE_URL`              | Supabase 项目地址                                |
| `SUPABASE_ANON_KEY`         | Supabase 匿名密钥                                |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role 密钥（绕过 RLS，后端专用） |
| `JWT_SECRET`                | JWT 加密密钥                                     |
| `OPENROUTER_API_KEY`        | OpenRouter API 密钥                              |
| `UNSPLASH_ACCESS_KEY`       | Unsplash Access Key                              |
| `GITHUB_TOKEN`              | GitHub Personal Access Token（用于保存生成图片） |
| `GITHUB_REPO_OWNER`         | GitHub 用户名                                    |
| `GITHUB_REPO_NAME`          | 存放图片的仓库名                                 |
| `GITHUB_BRANCH`             | 目标分支，通常填 `main`                          |

> Netlify 本地开发（`netlify dev`）会自动读取根目录的 `.env` 文件，无需手动 `source`。

## 本地开发

**前置条件：** 需提前安装 [Node.js 20](https://nodejs.org/) 和 [Yarn 1.x](https://classic.yarnpkg.com/en/docs/install)（`npm install -g yarn`）

1. 克隆仓库

   ```bash
   git clone https://github.com/sunling/inspireplanet.cc
   cd inspireplanet.cc
   ```

2. 切换 Node 版本（需 Node 20）

   ```bash
   nvm use 20
   # 或使用 fnm：fnm use 20
   ```

3. 安装依赖（使用 Yarn 1.x）

   ```bash
   yarn
   ```

4. 配置环境变量

   ```bash
   cp .env.example .env
   # 用编辑器打开 .env，填入各项真实值
   ```

5. 启动本地开发服务

   ```bash
   yarn dev
   ```

   这会同时启动：
   - Vite 开发服务器（`:5173`，热更新）
   - Netlify Dev（`:8888`，代理 Vite + 运行 Functions）

6. 打开浏览器访问 `http://localhost:8888`

> 如果只需要调试前端 UI（不需要调用后端函数），可以单独运行 `yarn vite:dev`，访问 `http://localhost:5173`。

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

## 第三方工具

1.[react官网](https://zh-hans.react.dev/)

2.[组件库:material-ui](https://mui.com/material-ui/all-components/)

3.[时间处理:day.js](https://day.nodejs.cn/docs/en/installation/node-js)
