import { Hono } from 'hono';
import { Env, ShopTokenData } from '../types';
import { ShopifyOAuth } from '../services/shopify-oauth';
import { KVStorage } from '../services/kv-storage';

const auth = new Hono<{ Bindings: Env }>();

/**
 * GET /auth
 * Initiate OAuth flow - redirect merchant to Shopify authorization
 */
auth.get('/', async (c) => {
  const shop = c.req.query('shop');

  if (!shop) {
    return c.json({ error: 'Missing shop parameter' }, 400);
  }

  const oauth = new ShopifyOAuth(c.env);

  // Validate shop domain
  if (!oauth.validateShopDomain(shop)) {
    return c.json({ error: 'Invalid shop domain' }, 400);
  }

  // Generate state for CSRF protection (optional but recommended)
  const state = crypto.randomUUID();
  
  // In production, store state in KV with expiry and verify in callback
  // For now, we'll skip state verification for simplicity

  // Redirect to Shopify OAuth
  const authUrl = oauth.getAuthUrl(shop, state);
  
  return c.redirect(authUrl);
});

/**
 * GET /auth/callback
 * Handle OAuth callback from Shopify
 * Exchange authorization code for access token and store in KV
 */
auth.get('/callback', async (c) => {
  const code = c.req.query('code');
  const shop = c.req.query('shop');
  const hmac = c.req.query('hmac');

  if (!code || !shop) {
    return c.json({ error: 'Missing required parameters' }, 400);
  }

  const oauth = new ShopifyOAuth(c.env);
  const storage = new KVStorage(c.env.SHOP_TOKENS);

  // Validate shop domain
  if (!oauth.validateShopDomain(shop)) {
    return c.json({ error: 'Invalid shop domain' }, 400);
  }

  // Validate HMAC
  const params: Record<string, string> = {};
  c.req.queries().forEach((value, key) => {
    if (Array.isArray(value)) {
      params[key] = value[0];
    } else {
      params[key] = value;
    }
  });

  const isValidHmac = await oauth.validateHmac(params);
  if (!isValidHmac) {
    return c.json({ error: 'Invalid HMAC signature' }, 403);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await oauth.exchangeCodeForToken(shop, code);

    // Store token in KV
    const tokenData: ShopTokenData = {
      accessToken: tokenResponse.access_token,
      scope: tokenResponse.scope,
      installedAt: new Date().toISOString(),
      shop: shop,
    };

    await storage.storeShopToken(shop, tokenData);

    console.log(`Successfully installed app for shop: ${shop}`);

    // Redirect to app
    // In Shopify embedded apps, redirect to the app URL with shop and host params
    const host = c.req.query('host');
    const redirectUrl = `https://${shop}/admin/apps/${c.env.SHOPIFY_API_KEY}`;
    
    return c.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return c.json({ 
      error: 'Failed to complete OAuth flow',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /auth/uninstall
 * Handle app uninstallation (called via webhook)
 */
auth.post('/uninstall', async (c) => {
  // This would be called by a Shopify webhook
  // For now, just a placeholder
  const shop = c.req.query('shop');
  
  if (shop) {
    const storage = new KVStorage(c.env.SHOP_TOKENS);
    await storage.deleteShopToken(shop);
    console.log(`App uninstalled for shop: ${shop}`);
  }

  return c.json({ success: true });
});

export default auth;

