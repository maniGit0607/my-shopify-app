import { Hono } from 'hono';
import { Env } from '../types';
import { validateSessionToken, getShop, getSessionToken } from '../middleware/session-token';
import { KVStorage } from '../services/kv-storage';
import { TokenExchange } from '../services/token-exchange';

const api = new Hono<{ Bindings: Env }>();

// Apply session token validation middleware to all API routes
api.use('/*', validateSessionToken);

/**
 * POST /api/graphql
 * Proxy GraphQL requests to Shopify API using token exchange
 * 
 * Flow:
 * 1. Frontend sends session token in Authorization header
 * 2. Middleware validates session token and extracts shop
 * 3. Exchange session token for access token (online token, 24h expiry)
 * 4. Use access token to call Shopify GraphQL API
 * 5. Return response to frontend
 */
api.post('/graphql', async (c) => {
  try {
    // Get shop and session token from context (set by middleware)
    const shop = getShop(c);
    const sessionToken = getSessionToken(c);
    
    if (!shop || !sessionToken) {
      return c.json({ error: 'Shop or session token not found' }, 401);
    }

    // Get GraphQL query from request body
    const body = await c.req.json();
    
    if (!body.query) {
      return c.json({ error: 'Missing GraphQL query' }, 400);
    }

    console.log(`[GraphQL] Processing request for shop: ${shop}`);
    
    let accessToken: string | null = null;

    // Use token exchange to get online access token
      console.log('[GraphQL] No stored token, using token exchange');
      const tokenExchange = new TokenExchange(c.env);
      accessToken = await tokenExchange.exchangeForOnlineToken(sessionToken, shop);
      
      if (!accessToken) {
        return c.json({ 
          error: 'Token exchange failed',
          message: 'Could not obtain access token. Please reinstall the app.',
          shop: shop
        }, 403);
      }

    // Make request to Shopify GraphQL API
    const shopifyResponse = await fetch(
      `https://${shop}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({
          query: body.query,
          variables: body.variables || {},
        }),
      }
    );

    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error('Shopify API error:', errorText);
      return c.json({ 
        error: 'Shopify API request failed',
        status: shopifyResponse.status,
        details: errorText
      }, shopifyResponse.status);
    }

    const data = await shopifyResponse.json();
    
    // Return Shopify response
    return c.json(data);

  } catch (error) {
    console.error('GraphQL proxy error:', error);
    return c.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
api.get('/health', async (c) => {
  const shop = getShop(c);
  
  return c.json({ 
    status: 'healthy',
    shop: shop,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/shop-info
 * Get information about the current shop
 */
api.get('/shop-info', async (c) => {
  const shop = getShop(c);
  
  if (!shop) {
    return c.json({ error: 'Shop not found' }, 401);
  }
  
  const storage = new KVStorage(c.env.SHOP_TOKENS);
  const tokenData = await storage.getShopToken(shop);

  if (!tokenData) {
    return c.json({ 
      error: 'Shop not installed via OAuth',
      shop: shop,
      message: 'App is using token exchange for authentication'
    }, 200); // Not an error - just not using OAuth
  }

  return c.json({
    shop: tokenData.shop,
    scope: tokenData.scope,
    installedAt: tokenData.installedAt,
  });
});

export default api;


