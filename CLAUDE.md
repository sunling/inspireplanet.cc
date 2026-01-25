# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

启发星球 (Inspire Planet) - A community app for creators and learners focused on creating/sharing inspiration cards and organizing meetup activities. Built with React + TypeScript frontend and Netlify Functions backend, using Supabase as the database.

## Common Commands

```bash
yarn dev          # Start local development (Netlify Dev at :8888, proxies Vite at :5173)
yarn build        # Build for production
yarn test         # Run tests with Vitest
yarn vite:dev     # Run Vite only (without Netlify Functions)
```

To run a single test file:
```bash
npx vitest run src/tests/functions/cards.test.ts
```

## Architecture

### Frontend (`src/`)
- **React 19 + TypeScript + Vite** with MUI for UI components
- **Routing**: React Router v7 with lazy loading (`src/routes/index.tsx`)
- **Path alias**: `@` maps to `src/` (configured in `vite.config.mjs`)
- **Authentication**: JWT stored in `localStorage` (keys: `authToken`, `userData`)
- **Protected routes**: Wrapped with `ProtectedRoute` component that redirects to `/login`

### Backend (`src/netlify/functions/`)
Serverless functions deployed to Netlify. Key functions:
- `auth.ts` - Login, registration, session validation
- `cards.ts` - CRUD for inspiration cards
- `meetup.ts` / `rsvp.ts` - Activity management and registration
- `comments.ts` / `notifications.ts` - User interactions
- `searchImage.ts` / `uploadImage.ts` - Image handling via OpenRouter + Unsplash

### Database
- **Supabase** with singleton pattern (`src/database/supabase.ts`)
- Server-side uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
- Client-side uses `VITE_SUPABASE_ANON_KEY`

### HTTP Client (`src/netlify/configs/http.ts`)
Custom HTTP client that:
- Auto-injects auth token from localStorage
- Routes to `/.netlify/functions/` in dev, full origin in production
- Handles timeout (30s default) and error formatting

## Key Conventions

### Data Mapping
- **API (frontend)**: camelCase (`imagePath`, `gradientClass`, `likesCount`)
- **Database (Supabase)**: snake_case (`image_path`, `gradient_class`, `likes_count`)
- Functions must map between these formats

### Environment Variables
Client-side (Vite): prefix with `VITE_`
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Server-side (Netlify Functions): no prefix
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
OPENROUTER_API_KEY
UNSPLASH_ACCESS_KEY
GITHUB_TOKEN
```

### Testing
Tests use Vitest with mocked Supabase client. Test files are in `src/tests/functions/`.

## Node Version

Use Node 20 (specified in `package.json` engines and `netlify.toml`).
