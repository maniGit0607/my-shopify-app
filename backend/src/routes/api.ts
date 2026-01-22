import { Hono } from 'hono';
import { Env } from '../types';
import { validateSessionToken, getShop, getSessionToken } from '../middleware/session-token';
import { KVStorage } from '../services/kv-storage';
import { TokenExchange } from '../services/token-exchange';
import { ReconciliationService } from '../services/reconciliation-service';

const api = new Hono<{ Bindings: Env }>();

// Apply session token validation middleware to all API routes
api.use('/*', validateSessionToken);

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

/**
 * POST /api/reconcile
 * Reconcile historical order data from Shopify (last 3 years)
 * This fetches all orders and populates daily_metrics and daily_order_breakdown
 */
api.post('/reconcile', async (c) => {
  const shop = getShop(c);
  const sessionToken = getSessionToken(c);
  
  if (!shop || !sessionToken) {
    return c.json({ error: 'Shop or session token not found' }, 401);
  }

  try {
    console.log(`[Reconciliation] Starting for shop: ${shop}`);
    
    // Exchange session token for access token
    const tokenExchange = new TokenExchange(c.env);
    const accessToken = await tokenExchange.exchangeForOnlineToken(sessionToken, shop);
    
    if (!accessToken) {
      return c.json({ 
        error: 'Token exchange failed',
        message: 'Could not obtain access token. Please reinstall the app.',
      }, 403);
    }

    // Run reconciliation
    const reconciliationService = new ReconciliationService(c.env);
    const result = await reconciliationService.reconcileOrders(shop, accessToken);

    if (result.status === 'failed') {
      return c.json({
        status: 'failed',
        error: result.error,
        ordersProcessed: result.ordersProcessed,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
      }, 500);
    }

    return c.json({
      status: 'completed',
      ordersProcessed: result.ordersProcessed,
      totalOrders: result.totalOrders,
      pagesProcessed: result.currentPage,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
    });

  } catch (error) {
    console.error('[Reconciliation] Error:', error);
    return c.json({ 
      error: 'Reconciliation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default api;


