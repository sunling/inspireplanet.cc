# 🌍 flashcard-for-inspiration-planet

An automation tool for generating quote cards from the "Inspiration Planet" project.  
Supports batch creation of high-quality visuals, automatic publication via GitHub Pages, and visual editing for sharing on platforms like WeChat Official Account or Xiaohongshu.

---

## 🔥 Live Preview

👉 Public page:  
[https://sunling.github.io/flashcard-for-inspiration-planet/](https://sunling.github.io/flashcard-for-inspiration-planet/)

👉 Online Editor:  
[https://sunling.github.io/flashcard-for-inspiration-planet/editor.html](https://sunling.github.io/flashcard-for-inspiration-planet/editor.html)

---

## 📁 Project Structure

```
flashcard-for-inspiration-planet/
├── data.json                 # Data source for cards, each item includes title, quote, id, episode, etc.
├── template.html             # HTML template for each card with placeholders
├── card.css                  # Shared card styles for both template and editor
├── generate.js               # Core script to generate screenshots & publish cards
├── screenshots/              # Temporary screenshots before publishing
├── docs/
│   ├── index.html            # Auto-generated gallery page (via generate.js)
│   ├── editor.html           # Interactive card editor for preview and download
│   ├── images.json           # Auto-generated image list for editor
│   ├── images/               # Background images, each matches an id
│   └── generated_cards/      # Final card images for public view
```

---

## ✨ Features

- 🖼 High-resolution screenshots with clean cropping
- ⏱ Date & meeting time are auto-calculated from episode number
- 🔁 Smart skip for already-generated images
- 🧠 Supports batch generation and visual download
- 🌐 Fully deployable via GitHub Pages

---

## 🚀 How to Use

### 1. Install Dependencies

```bash
npm install puppeteer
```

> 💡 macOS users: Chrome path is manually set in `generate.js`

---

### 2. Prepare Data & Images

- Fill in `data.json` with your card content
- Ensure each `id` matches an image under `docs/images/`

---

### 3. Generate Cards

```bash
node generate.js
```

The script will:
- Render each `.card` to screenshot
- Copy newly generated images into `docs/generated_cards/`
- Generate `index.html` and `images.json`
- Push to GitHub and automatically update your GitHub Pages!

---

## 🧑‍💻 Online Editor

Visit:

```
https://sunling.github.io/flashcard-for-inspiration-planet/editor.html
```

Supports:
- Real-time preview with input
- Switch background image
- Export card to PNG

---

## 🧡 Created by

Designed and maintained by [Ling Sun](https://sunling.github.io)  
Feel free to reuse, adapt, or suggest improvements ✨
