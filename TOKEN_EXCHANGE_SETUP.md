# Token Exchange Authentication Setup

This app uses **Shopify's Token Exchange** authentication method for embedded apps. This is the modern, recommended approach that simplifies authentication flow.

## Overview

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. App loads in Shopify Admin iframe                        │
│    - App Bridge CDN script automatically initializes         │
│    - Session token available via window.shopify.idToken()    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend makes API call                                   │
│    - useAuthenticatedFetch hook gets session token           │
│    - Adds Authorization: Bearer <session_token> header       │
│    - Sends request to backend                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Backend validates session token                           │
│    - Middleware checks session token signature               │
│    - Extracts shop domain and user info                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Backend exchanges session token for access token          │
│    - Calls Shopify token exchange API                        │
│    - Gets online access token (24h expiry)                   │
│    - OR uses stored offline token from OAuth (if available)  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Backend calls Shopify Admin API                           │
│    - Uses access token to make GraphQL request               │
│    - Returns data to frontend                                │
└─────────────────────────────────────────────────────────────┘
```

## Key Benefits

✅ **No OAuth redirects** - Works seamlessly in iframe  
✅ **Automatic session tokens** - App Bridge CDN handles it  
✅ **On-demand tokens** - Get access tokens only when needed  
✅ **Simpler development** - No public URLs needed for OAuth callbacks  
✅ **Backward compatible** - OAuth flow still available if needed

## Setup Instructions

### 1. Backend Setup

The backend has been configured with token exchange:

- `backend/src/services/token-exchange.ts` - Token exchange service
- `backend/src/middleware/session-token.ts` - Session token validation
- `backend/src/routes/api.ts` - Updated to use token exchange

**Environment variables** (`backend/wrangler.toml`):
```toml
[vars]
SHOPIFY_API_KEY = "your-api-key"
SHOPIFY_SCOPES = "read_orders,read_products"
APP_URL = "https://your-backend-url.com"  # For OAuth fallback

# Set via wrangler secret:
# wrangler secret put SHOPIFY_API_SECRET
```

### 2. Frontend Setup

The frontend uses custom hooks for authenticated requests:

- `ui/src/hooks/useAuthenticatedFetch.js` - Base authenticated fetch
- `ui/src/hooks/useGraphQLFetch.js` - GraphQL-specific fetch (exported from useAuthenticatedFetch.js)

**Environment variables** (`ui/.env`):
```bash
VITE_BACKEND_URL=http://localhost:8787
```

For development with cloudflared tunnel:
```bash
VITE_BACKEND_URL=https://your-tunnel.trycloudflare.com
```

### 3. App Bridge CDN Setup

Already configured in `ui/index.html`:
```html
<meta name="shopify-api-key" content="your-api-key" />
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
```

## Development Workflow

### Option 1: Local Development (Simple)

No tunnels needed for testing basic functionality:

```bash
# Terminal 1: Start backend
cd backend
npm run dev  # Runs on localhost:8787

# Terminal 2: Start frontend  
cd ui
echo "VITE_BACKEND_URL=http://localhost:8787" > .env
npm run dev  # Runs on localhost:5173

# Terminal 3: Use Shopify CLI
shopify app dev
```

**Note:** This works if your app is already installed via OAuth or for testing with token exchange.

### Option 2: With Cloudflared Tunnel (Recommended)

For full functionality including API calls:

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Expose backend with cloudflared
cloudflared tunnel --url http://localhost:8787
# Copy the URL: https://xyz.trycloudflare.com

# Terminal 3: Start frontend with tunnel URL
cd ui
echo "VITE_BACKEND_URL=https://xyz.trycloudflare.com" > .env
npm run dev

# Terminal 4: Use Shopify CLI
shopify app dev
```

## Testing the Flow

### Test 1: Session Token Validation

Add this button to `Home.jsx` temporarily:

```javascript
const testSessionToken = async () => {
  console.log('=== Session Token Test ===');
  
  if (!window.shopify) {
    console.error('App Bridge not loaded');
    return;
  }
  
  const token = await window.shopify.idToken();
  console.log('Session token:', token);
  
  // Decode to see payload
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Payload:', payload);
};

// Add button in JSX
<button onClick={testSessionToken}>Test Session Token</button>
```

### Test 2: Backend API Call

The `OrdersPieChart` component already uses the new flow:

1. Open app in Shopify Admin
2. Go to Orders Reports tab
3. Check browser console for logs:
   - `[Auth Fetch] Getting session token from App Bridge`
   - `[Auth Fetch] Session token obtained`
   - `[GraphQL Fetch] Making request to: ...`
   - `[GraphQL Fetch] Success`

4. Check backend logs (Terminal 1):
   - `[GraphQL] Processing request for shop: ...`
   - `[GraphQL] Using stored OAuth token` (if OAuth) or
   - `[GraphQL] No stored token, using token exchange`

### Test 3: Health Check

```bash
# Get session token from browser console (step 1)
# Then call health endpoint:

curl -X GET \
  http://localhost:8787/api/health \
  -H 'Authorization: Bearer YOUR_SESSION_TOKEN'

# Should return:
{
  "status": "healthy",
  "shop": "your-shop.myshopify.com",
  "timestamp": "2024-11-11T..."
}
```

## Troubleshooting

### "App Bridge not loaded"

**Problem:** `window.shopify` is undefined

**Solutions:**
- Ensure app is loaded inside Shopify Admin (not standalone)
- Check CDN script in `index.html`
- Check meta tag with API key
- Look for App Bridge errors in console

### "Invalid session token"

**Problem:** Token validation fails

**Solutions:**
- Check API key matches in frontend meta tag and backend
- Ensure session token hasn't expired (check `exp` claim)
- Verify backend has correct `SHOPIFY_API_SECRET`

### "Token exchange failed"

**Problem:** Cannot exchange session token for access token

**Solutions:**
- Verify app has required scopes configured
- Check `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are correct
- Ensure shop domain is valid `.myshopify.com` format
- Check Shopify Admin API is accessible

### CORS Errors

**Problem:** Browser blocks requests to backend

**Solutions:**
- Backend CORS middleware should allow your frontend origin
- Check `backend/src/middleware/cors.ts` configuration
- Ensure `VITE_BACKEND_URL` is correct in frontend

## Backward Compatibility: OAuth Flow

The traditional OAuth flow is still available at:

- `GET /auth` - Initiate OAuth
- `GET /auth/callback` - OAuth callback

This is useful for:
- Getting offline access tokens (don't expire)
- App installation flow
- Shops that need to explicitly grant permissions

To use OAuth flow:
1. Set up tunnel for backend (OAuth callback requires public URL)
2. Configure `application_url` and `redirect_urls` in `shopify.app.toml`
3. Visit: `https://your-backend-url/auth?shop=your-shop.myshopify.com`

## Production Deployment

### Backend (Cloudflare Workers)

```bash
cd backend

# Set secrets
wrangler secret put SHOPIFY_API_SECRET

# Deploy
wrangler deploy

# Note your worker URL: https://my-app-backend.workers.dev
```

### Frontend

```bash
cd ui

# Update .env for production
echo "VITE_BACKEND_URL=https://my-app-backend.workers.dev" > .env

# Build
npm run build

# Deploy to your hosting (Cloudflare Pages, Vercel, etc.)
```

### Update Shopify App Configuration

Update `shopify.app.toml`:
```toml
application_url = "https://your-frontend-url.com"

[auth]
redirect_urls = [
  "https://my-app-backend.workers.dev/auth/callback"
]
```

## Resources

- [Shopify Token Exchange Documentation](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/token-exchange)
- [App Bridge Documentation](https://shopify.dev/docs/api/app-bridge)
- [Session Tokens](https://shopify.dev/docs/apps/build/authentication-authorization/session-tokens)

