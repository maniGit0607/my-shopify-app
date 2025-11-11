# Environment Variables Setup

## Required Variables

Create a `.env` file in the `ui/` directory with the following:

```bash
# Backend URL for API calls
# Development: Use your cloudflared tunnel URL or localhost
VITE_BACKEND_URL=http://localhost:8787

# Production: Use your deployed Cloudflare Worker URL
# VITE_BACKEND_URL=https://my-shopify-app-backend.workers.dev
```

## How to Use

1. Copy this template to `.env`:
   ```bash
   cp ENV_SETUP.md .env
   # Then edit .env with your values
   ```

2. For development with cloudflared tunnel:
   ```bash
   # Terminal 1: Start backend
   cd backend
   npm run dev
   
   # Terminal 2: Expose backend with cloudflared
   cloudflared tunnel --url http://localhost:8787
   # Copy the URL (e.g., https://xyz.trycloudflare.com)
   
   # Terminal 3: Update .env and start UI
   cd ui
   echo "VITE_BACKEND_URL=https://xyz.trycloudflare.com" > .env
   npm run dev
   ```

3. For production:
   - Deploy backend to Cloudflare Workers
   - Set `VITE_BACKEND_URL` to your worker URL
   - Build and deploy UI

## Note

The backend URL is used by the `useAuthenticatedFetch` hook to make API calls with session tokens.

