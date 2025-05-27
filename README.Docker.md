
# Docker Deployment Guide

This guide explains how to deploy the Deals24 application using Docker.

## Prerequisites

- Docker and Docker Compose installed
- Environment variables configured

## Environment Setup

1. Copy the environment example file:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your actual values:
   - Set your Telegram bot token
   - Configure MongoDB credentials
   - Set admin credentials
   - Update CORS origins for production

## Development Deployment

For development with hot reload:

```bash
# Start all services in development mode
docker-compose -f docker-compose.dev.yml up --build

# Stop services
docker-compose -f docker-compose.dev.yml down
```

This will start:
- Frontend on http://localhost:8080
- Backend on http://localhost:3000
- MongoDB on localhost:27017
- Redis on localhost:6379

## Production Deployment

For production deployment:

```bash
# Start all services in production mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Individual Service Deployment

### Frontend Only
```bash
# Build frontend image
docker build -t deals24-frontend .

# Run frontend container
docker run -p 8080:80 \
  -e VITE_API_BASE_URL=https://your-api-domain.com/api \
  deals24-frontend
```

### Backend Only
```bash
# Build backend image
docker build -t deals24-backend ./backend

# Run backend container
docker run -p 3000:3000 \
  -e MONGODB_URI=mongodb://your-mongo-host:27017/deals24 \
  -e TELEGRAM_BOT_TOKEN=your_token \
  deals24-backend
```

## Environment Variables

### Frontend (.env)
- `VITE_API_BASE_URL`: Backend API URL
- `VITE_ADMIN_USERNAME`: Admin username
- `VITE_ADMIN_PASSWORD`: Admin password

### Backend (.env)
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3000)
- `MONGODB_URI`: MongoDB connection string
- `TELEGRAM_BOT_TOKEN`: Telegram bot token
- `TELEGRAM_CHANNEL_ID`: Telegram channel ID (optional)
- `WEBHOOK_URL`: Webhook URL for production
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: JWT secret key
- `CORS_ALLOWED_ORIGINS`: Allowed CORS origins
- `IS_SALE_MODE`: Sale mode flag (true/false)

## Health Checks

The backend includes health checks. Check service health:

```bash
# Check backend health
curl http://localhost:3000/api/health

# Check container health
docker ps
```

## Logs

View logs for specific services:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Troubleshooting

1. **Port conflicts**: Change ports in docker-compose.yml if needed
2. **Permission issues**: Ensure proper file permissions
3. **Environment variables**: Verify all required variables are set
4. **Network issues**: Check if services can communicate within Docker network

## Scaling

Scale specific services:

```bash
# Scale backend instances
docker-compose up -d --scale backend=3
```

## Security Notes

- Change default passwords in production
- Use proper secrets management
- Configure firewalls appropriately
- Use HTTPS in production
- Regularly update Docker images
