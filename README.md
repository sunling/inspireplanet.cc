# ✨ 启发星球金句卡片 & 封面图生成器

这是一个为「启发星球」项目设计的视觉内容生成器，支持创建带关键词/引导语的**金句卡片**与**封面图**，并支持本地批量生成、在线编辑、下载与部署展示。

---

## 🚀 功能特点

### 🖼 封面图生成器
- 支持两种类型：
  - 📌 **关键词 + 引导问题式**
  - 💬 **上下独白对话式** （待实现）
- 支持自定义背景图
- 支持实时预览 + PNG 下载
- 后续支持情绪标签筛选背景图

👉 在线体验：
- [关键词式编辑器](https://sunling.github.io/flashcard-for-inspiration-planet/cover-editor.html)
- [金句卡片编辑器](https://sunling.github.io/flashcard-for-inspiration-planet/card-editor.html)

---

### 📒 金句卡片生成器
- 自定义标题 / 金句 / 具体事例
- 自动计算会议日期、下次会议时间
- 每张卡片配背景图，导出为高清竖图
- 本地批量生成 + 上传展示

👉 示例展示：[所有卡片](https://sunling.github.io/flashcard-for-inspiration-planet)

---

## 🧰 使用指南

### 1. 安装依赖

```bash
npm install
```

### 2. 本地生成内容

```bash
npm run gen:cards   # 批量生成金句卡片
npm run gen:cover   # 批量生成封面图
```

---

## 🗂 项目结构概览

```
flashcard-for-inspiration-planet/
├── data/                   # 金句卡片数据 json
├── docs/                   # GitHub Pages 托管目录
│   ├── cover-editor.html   # 封面图关键词式编辑器
│   ├── cover-dialogue-editor.html # 封面图对话式编辑器
│   ├── index.html          # 卡片展示页
│   ├── generated/
│   │   ├── cards/          # 导出的金句卡片图像
│   │   └── covers/         # 导出的封面图图像
│   └── images.json         # 背景图元数据（含情绪标签）
├── images/                 # 所有背景图资源
├── scripts/                # puppeteer 生成脚本
│   ├── generate-card.js
│   ├── generate-cover.js
│   └── ...
├── templates/              # HTML模板
├── cover.css               # 通用视觉样式
└── README.md
```

---

## ✅ TODO

- [x] 支持封面关键词图生成
- [x] 支持上下独白式封面图
- [x] 在线编辑 & 下载
- [x] 自动会议时间生成
- [ ] 支持按情绪筛选背景图
- [ ] 批量生成封面图 HTML 页面预览

---

欢迎体验 & 欢迎建议 🌱
