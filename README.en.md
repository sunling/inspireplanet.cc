# Flashcard for Inspiration Planet ✨

A web application to create, upload, and showcase inspirational flashcards from books, podcasts, movies, and personal reflections. This project allows users to capture moments of inspiration and share them with others in a visually appealing format.

## Project Overview

This web app enables users to create beautiful inspiration cards with customizable themes, fonts, and background images. Cards can be created individually through the web interface or uploaded in bulk through the admin panel. All cards are stored in Airtable and displayed on the website grouped by date or episode.

## Project Structure

```
/docs          # Old pages (e.g., card-editor.html, cover-editor.html, etc.)
/public        # Main production site
  ├── /admin   # Bulk upload tools (bulk-uploader.html)
  ├── /images  # Card background images
  ├── /scripts # JavaScript files (cardUtils.js, bulk-uploader.js, etc.)
  ├── cards.html         # Page to view all cards (grouped by dates)
  ├── index.html         # Home page (create cards + latest cards carousel)
  ├── weekly-cards.html  # Page to view weekly meeting cards (grouped by episode)
/netlify/functions # Netlify serverless functions
  ├── clearCache.js
  ├── fetchAirtableData.js
  ├── fetchAirtableDataWithoutCache.js
  ├── uploadCardToAirtable.js
  ├── uploadImageToGitHub.js
  ├── uploadWeeklyCard.js
/user_uploads  # Uploaded images
images.json    # Defined list of images for cards
```

## Netlify Functions

The project uses Netlify serverless functions to handle API requests securely:

- **fetchAirtableData.js** – Fetch cached latest 100 cards ordered by created date
- **fetchAirtableDataWithoutCache.js** – Force fetch cards from Airtable (no cache)
- **clearCache.js** – Clear the Airtable cache after upload
- **uploadCardToAirtable.js** – Upload a single user-created card
- **uploadImageToGitHub.js** – Upload user-uploaded images to a GitHub repo
- **uploadWeeklyCard.js** – Upload weekly meeting cards in bulk

## Main Features

- **Create Personalized Cards**: Design inspiration cards with customizable themes, fonts, and images
- **Secure Uploads**: All cards are uploaded to Airtable via serverless functions
- **Organized Display**: View cards grouped by dates (all cards) or by episodes (weekly cards)
- **Download Functionality**: Download cards directly from the site as high-quality images
- **Latest Cards Carousel**: Browse through the most recent 10 cards on the homepage
- **Admin Panel**: Bulk upload weekly meeting cards through a dedicated admin interface

## Deployment Information

- **Hosting**: Netlify
- **Production URL**: https://inspiration-planet.netlify.app
- **Configuration**: Use `.env` file to configure Airtable API keys and table names

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
   AIRTABLE_TOKEN=your_airtable_api_key
   AIRTABLE_BASE_NAME=your_base_id
   AIRTABLE_TABLE_NAME=your_table_id
   AIRTABLE_TABLE_NAME_WEEKLY=your_weekly_table_id
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
