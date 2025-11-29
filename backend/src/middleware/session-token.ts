import { Context, Next } from 'hono';
import { Env, SessionTokenPayload } from '../types';
import { TokenExchange } from '../services/token-exchange';

/**
 * Middleware to validate session tokens from App Bridge
 * Extracts the Bearer token from Authorization header and validates it
 */
export async function validateSessionToken(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix
  const tokenExchange = new TokenExchange(c.env);

  const payload = await tokenExchange.validateSessionToken(sessionToken);

  if (!payload) {
    return c.json({ error: 'Invalid session token' }, 401);
  }

  // Store payload and session token in context for use in routes
  c.set('sessionTokenPayload', payload);
  c.set('sessionToken', sessionToken);
  c.set('shop', tokenExchange.getShopFromPayload(payload));

  await next();
}

/**
 * Helper to get session token payload from context
 */
export function getSessionPayload(c: Context): SessionTokenPayload | undefined {
  return c.get('sessionTokenPayload');
}

/**
 * Helper to get shop from context
 */
export function getShop(c: Context): string | undefined {
  return c.get('shop');
}

/**
 * Helper to get session token from context
 */
export function getSessionToken(c: Context): string | undefined {
  return c.get('sessionToken');
}

