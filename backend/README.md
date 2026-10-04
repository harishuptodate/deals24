
# Deals24 Backend

This is the backend server for Deals24, which handles Telegram message aggregation and storage.

## Setup Instructions

1. Install dependencies:
   ```
   npm install
   ```

2. Set up your environment variables by creating a `.env` file based on the template.

3. Configure your Telegram bot:
   - Create a bot using BotFather on Telegram
   - Add your bot to your channel as an admin
   - Set the bot token in the `.env` file

4. For production deployment:
   - Set `NODE_ENV=production`
   - Update the `WEBHOOK_URL` with your actual domain
   - Ensure your server is accessible from the internet with HTTPS

5. For development:
   - The bot will run in polling mode automatically

6. Start the server:
   ```
   npm run dev
   ```

### Deal alert email configuration

Deal and keyword alerts use Brevo's HTTPS API. Add these variables to the backend service:

```env
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender@gmail.com
BREVO_SENDER_NAME=Deals24
PUBLIC_APP_URL=https://deals24.vercel.app
PUBLIC_API_URL=https://your-render-service.onrender.com
```

If the Brevo variables are absent, subscriptions can still be managed but no emails are sent.

## Bot Functionality

The bot automatically filters messages based on the following criteria:
- Messages older than 5 minutes are ignored
- Low-context messages (too short or generic) are filtered
- Duplicate messages are detected via content hashing
- In "sale mode", only profitable product categories are processed

All filtering logic is in the `telegramService.js` file.

## API Endpoints

- `GET /api/telegram/messages` - Get paginated messages
- `GET /api/telegram/messages/:id` - Get a specific message by ID
- `POST /api/telegram/webhook` - Webhook endpoint for Telegram updates
- `GET|POST /api/alerts` - List or create browser-owned alerts
- `PATCH|DELETE /api/alerts/:id` - Pause, resume, update, or remove an alert

## Deployment

For deployment, set the proper environment variables and ensure your server can receive webhook requests from Telegram.
