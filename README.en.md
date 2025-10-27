# Flashcard for Inspiration Planet ✨

A web application to create, upload, and showcase inspirational flashcards from books, podcasts, movies, and personal reflections. This project allows users to capture moments of inspiration and share them with others in a visually appealing format.

## Project Overview

This web app enables users to create beautiful inspiration cards with customizable themes, fonts, and background images. Cards can be created individually through the web interface or uploaded in bulk through the admin panel. All cards are stored in Supabase and displayed on the website grouped by date or episode.

## Project Structure

```
/docs          # Old pages (e.g., card-editor.html, cover-editor.html, etc.)
/public        # Main production site
  ├── /admin   # Bulk upload tools (bulk-uploader.html)
  ├── /images  # Card background images
  ├── /scripts # JavaScript files (cardUtils.js, bulk-uploader.js, etc.)
  ├── auth.html          # Login page
  ├── signup.html        # Sign-up page
  ├── card-detail.html   # View single card
  ├── cards.html         # View all cards
  ├── daily-card.html    # Daily card editor
  ├── index.html         # Home page (create cards + latest carousel)
  ├── text-optimizer.html # Text optimizer
  ├── weekly-cards.html  # Weekly meeting cards page
  ├── cover-editor.html  # Landscape cover maker
  ├── cover-editor-mobile.html  # Portrait cover maker
  images.json    # Defined list of images for cards
/public/netlify/functions # Netlify serverless functions
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
/user_uploads  # Uploaded images
```

## Netlify Functions

The project uses Netlify serverless functions to handle API requests securely:


- **authHandler.js** – Handles login, signup and sessions
- **cardsHandler.js** – Fetch cards from Supabase
- **commentsHandler.js** – Manage comments data
- **fetchWeeklyCards.js** – Get weekly meeting cards
- **optimizeText.js** – Optimize text using AI
- **searchImage.js** – Search suitable images
- **uploadImageToGitHub.js** – Save images to GitHub
- **uploadWeeklyCard.js** – Upload weekly cards in bulk
- **workshopHandler.js** – Workshop related API
## Main Features


- **Create Personalized Cards**: Design inspiration cards with customizable themes, fonts, and images
- **Text Optimizer**: Refine card text using AI
- **Daily Card Editor**: Quickly create daily cards
- **User Authentication**: Login and signup via Supabase
- **Secure Uploads**: All cards are stored in Supabase via serverless functions
- **Organized Display**: View cards grouped by dates (all cards) or by episodes (weekly cards)
- **Download Functionality**: Download cards as high-quality images
- **Latest Cards Carousel**: Browse the most recent 10 cards on the homepage
- **Admin Panel**: Bulk upload weekly meeting cards through a dedicated admin interface
## Deployment Information

- **Hosting**: Netlify
- **Production URL**: https://inspiration-planet.netlify.app
- **Configuration**: Use `.env` file to configure Supabase credentials and other API keys

## Local Development

To set up the project locally:

1. Clone the repository
   ```
   git clone https://github.com/yourusername/flashcard-for-inspiration-planet.git
   cd flashcard-for-inspiration-planet
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```

   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   JWT_SECRET=your_jwt_secret
   OPENROUTER_API_KEY=your_openrouter_key
   UNSPLASH_ACCESS_KEY=your_unsplash_key

   GITHUB_TOKEN=your_github_token
   GITHUB_REPO_OWNER=your_github_username
   GITHUB_REPO_NAME=your_repo_name
   GITHUB_BRANCH=main
   ```
4. Start the Netlify Dev server
   ```
   npx netlify dev
   ```

5. Open your browser and navigate to `http://localhost:8888`

## Future Improvements

- Improve mobile responsiveness for all pages
- Add pagination to card display pages for better performance
- Implement user authentication for personalized card collections
- Add search and filtering capabilities
- Create a dashboard for card statistics and analytics
- Allow users to favorite or bookmark cards
- Implement social sharing features

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests if you have ideas for improvements or find any bugs.

## Credits

Built with ❤️ for Inspiration Planet ✨.

By ([Sun ling](https://sunling.github.io/)).
