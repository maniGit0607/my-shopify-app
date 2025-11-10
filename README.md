# My Shopify App - Reporting Dashboard

A Shopify embedded app for reporting and analytics with:
- **Frontend**: React + Vite + Shopify Polaris
- **Backend**: Hono + Cloudflare Workers
- **Storage**: Cloudflare KV for access tokens

## Project Structure

```
my-shopify-app/
├── ui/                     # React frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/                # Hono backend (Cloudflare Workers)
│   ├── src/
│   │   ├── index.ts       # Main app
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── middleware/    # Auth & CORS
│   ├── wrangler.toml      # Cloudflare config
│   └── package.json
└── package.json            # Root workspace
```

## Setup Instructions

### 1. Install Dependencies

```bash
# Install all dependencies
npm run install:all

# Or manually:
cd ui && npm install
cd ../backend && npm install
```

### 2. Configure Backend

#### Create KV Namespace
```bash
cd backend
npx wrangler kv:namespace create SHOP_TOKENS
```

Copy the ID and update `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "SHOP_TOKENS"
id = "your_kv_namespace_id_here"
```

#### Set Secrets
```bash
cd backend

# Set Shopify API Secret
npx wrangler secret put SHOPIFY_API_SECRET
# Enter your secret when prompted
```

#### Update Environment Variables

Edit `backend/wrangler.toml`:
```toml
[vars]
SHOPIFY_API_KEY = "your_api_key"
SHOPIFY_SCOPES = "write_products,read_orders"
APP_URL = "https://your-worker.workers.dev"  # Update after deploy
```

### 3. Deploy Backend

```bash
cd backend
npm run deploy
```

Note the Worker URL (e.g., `https://my-shopify-app-backend.your-subdomain.workers.dev`)

### 4. Configure Frontend

Create `ui/.env.local`:
```env
VITE_BACKEND_URL=https://your-worker-url.workers.dev
```

### 5. Update Shopify App Configuration

Update your `shopify.app.toml` and `shopify.app.my-shop-app.toml`:

```toml
[access_scopes]
scopes = "write_products,read_orders"

[auth]
redirect_urls = [
  "https://your-worker-url.workers.dev/auth/callback"
]
```

### 6. Start Development

```bash
# Terminal 1: Backend (Wrangler Dev)
cd backend
npm run dev

# Terminal 2: Frontend (Vite)
cd ui
npm run dev

# Terminal 3: Shopify CLI
shopify app dev --tunnel-url https://your-ngrok-url.ngrok-free.app
```

## OAuth Flow

### Installation
1. Merchant clicks "Install App"
2. Redirected to `/auth?shop=store.myshopify.com`
3. Backend redirects to Shopify OAuth page
4. Merchant approves permissions
5. Shopify redirects to `/auth/callback?code=...&shop=...`
6. Backend exchanges code for access token
7. Token stored in Cloudflare KV
8. Merchant redirected to app

### API Calls
1. Frontend makes request with App Bridge session token
2. Backend verifies session token
3. Extracts shop domain from token
4. Retrieves access token from KV
5. Makes authenticated request to Shopify API
6. Returns data to frontend

## API Endpoints

### Backend API

#### OAuth
- `GET /auth` - Initiate OAuth flow
- `GET /auth/callback` - OAuth callback handler

#### API (Requires Session Token)
- `POST /api/graphql` - GraphQL proxy to Shopify
- `GET /api/health` - Health check
- `GET /api/shop-info` - Get shop information

## Development

### Run Both Services
```bash
npm run dev
```

### Backend Only
```bash
cd backend && npm run dev
```

### Frontend Only
```bash
cd ui && npm run dev
```

## Deployment

### Backend
```bash
cd backend
npm run deploy
```

### Frontend
Deploy the `ui/dist` folder to your hosting (Vercel, Netlify, etc.) after:
```bash
cd ui
npm run build
```

## Environment Variables

### Backend (wrangler.toml)
- `SHOPIFY_API_KEY` - Shopify app API key
- `SHOPIFY_SCOPES` - Required scopes (comma-separated)
- `APP_URL` - Your Cloudflare Worker URL

### Backend (Secrets via Wrangler)
- `SHOPIFY_API_SECRET` - Shopify app API secret

### Frontend (.env.local)
- `VITE_BACKEND_URL` - Backend API URL

## Troubleshooting

### CORS Errors
- Ensure backend is running on correct URL
- Check `VITE_BACKEND_URL` in frontend
- Verify CORS middleware allows your origin

### OAuth Errors
- Verify redirect URL in Shopify Partner Dashboard
- Check HMAC validation is working
- Ensure API key/secret are correct

### Token Errors
- Verify session token is being sent in Authorization header
- Check token signature verification
- Ensure shop has installed the app (token exists in KV)

## License

MIT
