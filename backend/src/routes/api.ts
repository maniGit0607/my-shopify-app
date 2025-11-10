import { Hono } from 'hono';
import { Env } from '../types';
import { sessionMiddleware } from '../middleware/verify-session';
import { KVStorage } from '../services/kv-storage';

const api = new Hono<{ Bindings: Env }>();

// Apply session verification middleware to all API routes
api.use('/*', sessionMiddleware);

/**
 * POST /api/graphql
 * Proxy GraphQL requests to Shopify API with stored access token
 */
api.post('/graphql', async (c) => {
  try {
    // Get shop from session (set by middleware)
    const shop = c.get('shop') as string;
    
    if (!shop) {
      return c.json({ error: 'Shop not found in session' }, 401);
    }

    // Retrieve access token from KV
    const storage = new KVStorage(c.env.SHOP_TOKENS);
    const tokenData = await storage.getShopToken(shop);

    if (!tokenData) {
      return c.json({ 
        error: 'Shop not installed',
        message: 'Please install the app first',
        shop: shop
      }, 403);
    }

    // Get GraphQL query from request body
    const body = await c.req.json();
    
    if (!body.query) {
      return c.json({ error: 'Missing GraphQL query' }, 400);
    }

    // Make request to Shopify GraphQL API
    const shopifyResponse = await fetch(
      `https://${shop}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': tokenData.accessToken,
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
  const shop = c.get('shop') as string;
  
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
  const shop = c.get('shop') as string;
  const storage = new KVStorage(c.env.SHOP_TOKENS);
  const tokenData = await storage.getShopToken(shop);

  if (!tokenData) {
    return c.json({ 
      error: 'Shop not installed',
      shop: shop
    }, 403);
  }

  return c.json({
    shop: tokenData.shop,
    scope: tokenData.scope,
    installedAt: tokenData.installedAt,
  });
});

export default api;

