
# Deals24 - Telegram Deals Aggregator

A web application that aggregates and displays deals from Telegram channels.

## Project Structure

### Frontend (React + TypeScript + Vite)
- `/src` - Frontend source code
  - `/components` - UI components
  - `/services` - API services
  - `/types` - TypeScript type definitions

### Backend (Node.js + Express + MongoDB)
- `/backend` - Backend source code
  - `/models` - MongoDB schemas
  - `/routes` - API routes
  - `/services` - Business logic
  - `/utils` - Utility functions
  - `/scripts` - Helper scripts

## Getting Started

### Prerequisites
- Node.js (v14+)
- MongoDB
- Redis (optional, for caching)
- Telegram Bot API Token

### Installation

1. Clone the repository
```
git clone https://github.com/yourusername/deals24.git
cd deals24
```

2. Install frontend dependencies
```
npm install
```

3. Install backend dependencies
```
cd backend
npm install
```

4. Set up environment variables
   - Copy `.env.example` to `.env` and fill in your values

5. Start the development servers

**Frontend:**
```
npm run dev
```

**Backend:**
```
cd backend
npm run dev
```

## Setting up Telegram Bot

1. Create a new bot using BotFather on Telegram
2. Add bot to your channel as administrator
3. Set the required environment variables in `.env`:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHANNEL_ID`

4. Run the script to fetch historic messages:
```
cd backend
node scripts/fetchHistoricMessages.js
```

## API Endpoints

### GET /api/telegram/messages
- Fetches paginated messages
- Query parameters:
  - `cursor`: Pagination cursor (ISO date string)
  - `limit`: Number of messages to fetch (default: 10)

### GET /api/telegram/messages/:id
- Fetches a single message by ID

## Deployment

### Frontend Deployment
1. Build the frontend
```
npm run build
```

2. Deploy the `dist` directory to a static hosting service

### Backend Deployment
1. Deploy the backend to a Node.js hosting service
2. Set up MongoDB Atlas or a managed MongoDB instance
3. Configure environment variables in your hosting environment
