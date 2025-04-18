# 🌍 flashcard-for-inspiration-planet

一个用于生成【启发星球】金句卡片的自动化图文工具。  
支持批量生成高质量截图，适用于公众号、小红书等平台发布。

---

## 🧩 项目功能

- 📅 自动根据集数（episode）生成对应发布日期和下一次会议时间
- 🖼 支持自定义配图，每张图对应一张卡片
- 📸 使用 Puppeteer 截图 `.card` 元素，输出高清、无边框金句图
- 🧠 支持多个金句数据批量导出

---

## 📁 项目结构

```
flashcard-for-inspiration-planet/
├── data.json            # 金句数据，仅需提供 episode、title、quote 等
├── template.html        # 卡片 HTML 模板，支持 {{变量}} 占位符
├── generate.js          # 生成器脚本，自动替换+截图
├── images/              # 存放配图，文件名需与 data.json 中 id 对应
└── screenshots/         # 输出目录，保存每张金句卡图（自动生成）
```

---

## ✍️ 使用说明

### 1. 安装依赖

```bash
npm install puppeteer
```

### 2. 添加图片到 `images/`

确保每条数据的 `id` 对应一张图片，例如：

```json
{
  "id": "sunlitkitchen",   // 对应 images/sunlitkitchen.png
  ...
}
```

### 3. 编写或编辑 `data.json`

你只需要写：

```json
[
  {
    "id": "sunlitkitchen",
    "title": "不要等太阳照进来",
    "quote": "我不要做等待太阳照到自己的人...",
    "detail": "李影回忆三年前在低谷时...",
    "episode": "EP14"
  }
]
```

🧠 系统会自动生成：
- `date`: 例如 `2025年4月19日`
- `meeting`: 下一期会议时间，如 `4月26日早8:00`
- `meeting_id`: 默认统一会议号 `818 7279 2687`

---

### 4. 运行生成脚本

```bash
node generate.js
```

生成的截图将保存在 `screenshots/` 文件夹中。

---

## ⚙️ 自动逻辑说明

| 字段名       | 说明                              |
|--------------|-----------------------------------|
| `episode`    | 例如 "EP14"，从 EP13 开始推算日期 |
| `date`       | 自动生成：每集对应的发布日期      |
| `meeting`    | 自动生成：下一集的会议时间        |
| `meeting_id` | 使用统一会议号，无需重复填写       |

---

## 🧡 联系作者

由 [Ling Sun](https://sunling.github.io) 设计与使用。  
如果你也想为社群内容自动生成精美图文，欢迎参考和复用 ✨
