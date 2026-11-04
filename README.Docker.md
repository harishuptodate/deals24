
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

The backend development container runs Node.js 20 and `tsx watch index.ts`. MongoDB uses the connection configured in `.env`, while the development Compose stack starts Redis on port 6379.

## Production Deployment

Production starts the backend and Redis together. MongoDB remains external (use
Atlas for Atlas Search and transaction support). The frontend is optional.
Images build natively on the Oracle Ampere ARM server; no platform override is needed.

Copy `.env.example` to `.env` if you do not already have one, then set your domains,
configuration, and credentials there. The `.env` file is ignored by Git and excluded
from Docker builds. Compose automatically loads it for variable interpolation;
only variables listed under a service's `environment` are passed to that service.
Shell variables take precedence. Redis's internal URL is set by the Compose file.

```bash
# Start backend and Redis
docker compose up -d --build

# Optionally include the frontend
docker compose --profile frontend up -d --build

# View logs
docker compose logs -f backend redis

# Stop services while preserving Redis data
docker compose down
```

Redis has no published host port. The backend uses `redis://redis:6379` on the
private Compose network, without a password. Do not expose Redis publicly or attach
untrusted containers to this network. Redis uses a named `/data` volume, AOF with
one-second fsync, a 512 MiB memory budget, and `noeviction` because it buffers clicks.
A crash can still lose the latest second of writes; persistence is not a backup.
Do not use `down -v` unless you intend to delete the Redis volume.

### Coolify on Oracle

1. Create a Git-based application with the **Docker Compose** build strategy.
2. Use Base Directory `/` and Compose Location `/docker-compose.yml`.
3. Import the values from your `.env` into
   Coolify's application environment variables. Keep secrets out of build variables.
   Coolify supplies these variables when rendering Compose; you do not need to
   upload `.env` or configure custom `--env-file` commands there.
4. Assign `https://api.yourdomain.com` to the **backend** service, targeting port
   `3000`. Keep the frontend profile disabled if the frontend is hosted elsewhere.
5. Point the domain's A record to the VPS. Allow TCP 80/443 in Oracle's security
   rules and the host firewall, and allow the VPS outbound IP in Atlas Network Access.
6. Deploy, check backend/Redis logs, and request `/api/health`. Confirm a Telegram
   post arrives and clicks persist: the health endpoint does not check Redis.
7. Set the separately hosted frontend's `VITE_API_BASE_URL` to
   `https://api.yourdomain.com/api` and rebuild it.

The backend's host port is bound to loopback for local checks. Coolify routes to
the container's port 3000 through its proxy. The Dockerfile already checks
`/api/health`; allow a longer startup period in Coolify if Atlas startup needs it.
Starting the backend with the existing bot token registers its configured webhook,
switching Telegram delivery to this backend. Stop the previous backend at cutover.

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
