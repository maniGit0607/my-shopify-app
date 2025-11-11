# Quick Setup Guide

## Prerequisites
- Node.js 18+
- npm or yarn
- Cloudflare account
- Shopify Partner account
- Shopify development store

## Quick Start

### 1. Install Dependencies
```bash
npm install
cd ui && npm install
cd ../backend && npm install && cd ..
```

### 2. Set Up Cloudflare KV
```bash
cd backend
npx wrangler login
npx wrangler kv:namespace create SHOP_TOKENS
```

Copy the KV namespace ID and update `backend/wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "SHOP_TOKENS"
id = "paste_your_id_here"
```

### 3. Configure Secrets

Create `backend/.dev.vars`:
```
SHOPIFY_API_SECRET=your_shopify_api_secret
```

For production, set secret via Wrangler:
```bash
npx wrangler secret put SHOPIFY_API_SECRET
```

### 4. Update Configuration

Edit `backend/wrangler.toml`:
```toml
[vars]
SHOPIFY_API_KEY = "your_shopify_api_key"
SHOPIFY_SCOPES = "write_products,read_orders"
APP_URL = "http://localhost:8787"  # For dev
```

### 5. Deploy Backend (Optional - for production)
```bash
cd backend
npm run deploy
```

Note your Worker URL and update:
- `backend/wrangler.toml` → `APP_URL`
- `ui/.env.local` → `VITE_BACKEND_URL`
- `shopify.app.my-shop-app.toml` → `redirect_urls`

### 6. Start Development

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd ui && npm run dev

# Terminal 3: Shopify CLI
shopify app dev
```

### 7. Install App
1. Open the URL from Shopify CLI
2. Click "Install app"
3. Approve permissions
4. App will redirect to Orders Reports

## Testing the Setup

### Test OAuth Flow
1. Visit: `http://localhost:8787/auth?shop=your-store.myshopify.com`
2. Approve permissions
3. Check console logs for "Successfully installed"

### Test API
```bash
# Get session token from browser (F12 → Application → Session Storage)
curl -X POST http://localhost:8787/api/graphql \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ shop { name } }"}'
```

## Common Issues

### "Shop not installed" Error
- Complete OAuth flow first
- Check KV namespace has the token
- Verify shop domain matches

### CORS Error
- Check `VITE_BACKEND_URL` matches backend URL
- Ensure backend is running
- Check browser console for exact error

### Session Token Error
- App must be accessed via Shopify Admin (embedded)
- Cannot test standalone on localhost
- Use Shopify CLI tunnel

## Next Steps

1. ✅ Complete OAuth installation
2. ✅ Test GraphQL proxy
3. 📊 View Orders pie chart
4. 🚀 Deploy to production

## Production Deployment

### Backend
```bash
cd backend
npm run deploy
# Update APP_URL in wrangler.toml with worker URL
```

### Frontend
```bash
cd ui
npm run build
# Deploy dist/ folder to Vercel/Netlify
```

### Update Shopify Config
Update redirect URLs in Shopify Partner Dashboard to match production URLs.


