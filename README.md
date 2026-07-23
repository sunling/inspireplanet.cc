[![Netlify Status](https://api.netlify.com/api/v1/badges/4a2ba2a5-6271-4ab1-86ce-581643e5dcfe/deploy-status)](https://app.netlify.com/sites/inspiration-planet/deploys)

# 启发星球 ✨

启发星球是一个围绕每周分享会展开的学习与创作社群。这里沉淀每期活动中的启发、金句与讨论，也承载活动报名、树洞互助、回顾与后续连接。

## 技术栈

- 前端：React + TypeScript + Vite
- UI：MUI（Material UI）
- 服务端：Netlify Functions（Node.js）
- 数据库：Supabase
- 图片资产：GitHub assets 仓库（`sunling/inspireplanet-assets`）
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
- `uploadImage.ts` – 将生成图片保存到 GitHub assets 仓库
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

`.env` 中需要配置两类变量：

**客户端变量（`VITE_` 前缀，Vite 构建时注入）**

| 变量名                     | 说明                                      |
| -------------------------- | ----------------------------------------- |
| `VITE_URL`                 | 本地开发填 `http://localhost:8888`        |
| `VITE_SUPABASE_URL`        | Supabase 项目地址                         |
| `VITE_SUPABASE_ANON_KEY`   | Supabase 匿名密钥（anon key）             |
| `VITE_OPENROUTER_API_KEY`  | OpenRouter API 密钥（用于搜图关键词生成） |
| `VITE_UNSPLASH_ACCESS_KEY` | Unsplash Access Key（用于搜图）           |
| `VITE_JWT_SECRET`          | JWT 加密密钥（与服务端保持一致）          |

**服务端变量（无前缀，Netlify Functions 运行时注入）**

| 变量名                      | 说明                                                 |
| --------------------------- | ---------------------------------------------------- |
| `URL`                       | 本地开发填 `http://localhost:8888`                   |
| `SUPABASE_URL`              | Supabase 项目地址                                    |
| `SUPABASE_ANON_KEY`         | Supabase 匿名密钥                                    |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role 密钥（绕过 RLS，后端专用）     |
| `JWT_SECRET`                | JWT 加密密钥                                         |
| `OPENROUTER_API_KEY`        | OpenRouter API 密钥                                  |
| `UNSPLASH_ACCESS_KEY`       | Unsplash Access Key                                  |
| `RESEND_API_KEY`            | Resend API 密钥（服务端发送邮件）                    |
| `RESEND_FROM_EMAIL`         | Resend 已验证的发件地址                              |
| `CONTACT_EMAIL`             | 邮件主收件地址，多个地址用英文逗号分隔               |
| `SUBMISSION_CC_EMAILS`      | 投稿抄送地址，多个地址用英文逗号分隔                 |
| `GITHUB_TOKEN`              | GitHub Personal Access Token（用于保存生成图片）     |
| `GITHUB_REPO_OWNER`         | GitHub 用户名，生产环境填 `sunling`                  |
| `GITHUB_REPO_NAME`          | 存放图片的仓库名，生产环境填 `inspireplanet-assets`  |
| `GITHUB_BRANCH`             | 目标分支，通常填 `main`                              |

> Netlify 本地开发（`netlify dev`）会自动读取根目录的 `.env` 文件，无需手动 `source`。

## 图片资产迁移

用户上传图片统一存放在独立仓库：

```text
sunling/inspireplanet-assets/user_uploads
```

图片 raw URL 格式：

```text
https://raw.githubusercontent.com/sunling/inspireplanet-assets/main/user_uploads/<filename>.png
```

历史数据中如果仍有旧仓库 raw URL，需要在 Supabase 中批量替换为上述新 URL 前缀。

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
