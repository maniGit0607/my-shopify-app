# Quick Start Guide - Token Exchange Implementation

## ✅ Refactoring Complete!

Your app now uses **Shopify Token Exchange** for authentication. The OAuth flow (`/auth` and `/auth/callback`) is still available but optional.

## What Changed

### Backend
- ✅ **New:** `token-exchange.ts` service - Exchanges session tokens for access tokens
- ✅ **New:** `session-token.ts` middleware - Validates session tokens from App Bridge
- ✅ **Updated:** `api.ts` routes - Now use token exchange instead of requiring stored OAuth tokens
- ✅ **Kept:** `auth.ts` routes - OAuth flow still available for offline tokens

### Frontend
- ✅ **New:** `useAuthenticatedFetch` hook - Automatically includes session token in requests
- ✅ **New:** `useGraphQLFetch` hook - GraphQL-specific authenticated requests
- ✅ **Updated:** `OrdersPieChart.jsx` - Uses new authenticated fetch hooks
- ✅ **Kept:** App Bridge CDN setup in `index.html`

## How to Test

### Step 1: Start Backend

```bash
cd backend
npm run dev
```

The backend will run on `http://localhost:8787`

### Step 2: Start Frontend

```bash
cd ui

# Create .env file with backend URL
echo "VITE_BACKEND_URL=http://localhost:8787" > .env

npm run dev
```

The frontend will run on `http://localhost:5173`

### Step 3: Open in Shopify Admin

```bash
# In a third terminal
shopify app dev
```

This will:
1. Ask you to select your app configuration
2. Open a preview URL in your browser
3. Load your app inside Shopify Admin

### Step 4: Test the Flow

1. **Open the app** in Shopify Admin (via the preview URL)

2. **Go to "Orders Reports" tab** - This will trigger the OrdersPieChart component

3. **Check Browser Console** for logs:
   ```
   [Auth Fetch] Getting session token from App Bridge
   [Auth Fetch] Session token obtained
   [GraphQL Fetch] Making request to: http://localhost:8787/api/graphql
   [GraphQL Fetch] Success
   ```

4. **Check Backend Terminal** for logs:
   ```
   [GraphQL] Processing request for shop: your-shop.myshopify.com
   [GraphQL] No stored token, using token exchange
   ```

5. **See the pie chart render** with your order data!

## If You Need Public Backend URL

For some features, you may need to expose your backend publicly:

```bash
# Install cloudflared
winget install --id Cloudflare.cloudflared

# Start tunnel
cloudflared tunnel --url http://localhost:8787
```

This will give you a URL like `https://xyz.trycloudflare.com`

Then update your UI `.env`:
```bash
echo "VITE_BACKEND_URL=https://xyz.trycloudflare.com" > ui/.env
```

## Troubleshooting

### "App Bridge not loaded"
- **Cause:** App not running inside Shopify Admin
- **Fix:** Use `shopify app dev` to open app in Shopify Admin, don't visit `localhost:5173` directly

### "Invalid session token"
- **Cause:** API key mismatch or token expired
- **Fix:** Verify `SHOPIFY_API_KEY` in `backend/wrangler.toml` matches meta tag in `ui/index.html`

### "Token exchange failed"
- **Cause:** App scopes not configured or API secret incorrect
- **Fix:** 
  1. Set API secret: `wrangler secret put SHOPIFY_API_SECRET` (in backend directory)
  2. Check scopes in `backend/wrangler.toml`: `read_orders,read_products,read_customers`

### CORS errors
- **Cause:** Backend CORS not allowing frontend origin
- **Fix:** Check `backend/src/middleware/cors.ts` - should allow your frontend URL

## Next Steps

1. ✅ **Test token exchange** - Follow steps above
2. 📝 **Remove old useShopifyFetch** - The old hook in `ui/src/hooks/useShopifyFetch.js` is no longer used
3. 🎨 **Update other components** - Apply the same pattern to other report components
4. 🚀 **Deploy** - See `TOKEN_EXCHANGE_SETUP.md` for production deployment

## Documentation

- 📖 **Full Setup Guide:** `TOKEN_EXCHANGE_SETUP.md`
- ⚙️ **Environment Variables:** `ui/ENV_SETUP.md`
- 📚 **Shopify Docs:** [Token Exchange](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/token-exchange)

## Need Help?

Check the logs in both terminals (backend and browser console) - they will show you exactly where the flow is failing.

Happy coding! 🎉

