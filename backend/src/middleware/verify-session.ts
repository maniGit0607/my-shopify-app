import { Context } from 'hono';
import { Env, SessionTokenPayload } from '../types';

/**
 * Verify Shopify App Bridge session token (JWT)
 */
export async function verifySessionToken(c: Context<{ Bindings: Env }>): Promise<SessionTokenPayload | null> {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    // Decode JWT (session token from App Bridge)
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = JSON.parse(atob(parts[1]));
    
    // Verify token
    const apiKey = c.env.SHOPIFY_API_KEY;
    const apiSecret = c.env.SHOPIFY_API_SECRET;
    
    // Check basic claims
    if (payload.aud !== apiKey) {
      throw new Error('Invalid audience');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired');
    }

    if (payload.nbf && payload.nbf > now) {
      throw new Error('Token not yet valid');
    }

    // Verify signature
    const encoder = new TextEncoder();
    const data = encoder.encode(`${parts[0]}.${parts[1]}`);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = Uint8Array.from(
      atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      data
    );

    if (!isValid) {
      throw new Error('Invalid signature');
    }

    return payload as SessionTokenPayload;
  } catch (error) {
    console.error('Session token verification failed:', error);
    return null;
  }
}

/**
 * Extract shop domain from session token
 */
export function getShopFromToken(payload: SessionTokenPayload): string {
  // Extract shop domain from dest URL
  const url = new URL(payload.dest);
  return url.hostname;
}

/**
 * Middleware to verify session and attach shop to context
 */
export async function sessionMiddleware(c: Context<{ Bindings: Env }>, next: Function) {
  const payload = await verifySessionToken(c);
  
  if (!payload) {
    return c.json({ error: 'Unauthorized - Invalid session token' }, 401);
  }

  const shop = getShopFromToken(payload);
  
  // Attach to context for use in routes
  c.set('sessionPayload', payload);
  c.set('shop', shop);
  
  await next();
}

