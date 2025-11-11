import { Env, SessionTokenPayload } from '../types';

/**
 * Token Exchange Service
 * Exchanges session tokens for access tokens using Shopify's token exchange API
 * https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/token-exchange
 */
export class TokenExchange {
  private apiKey: string;
  private apiSecret: string;

  constructor(env: Env) {
    this.apiKey = env.SHOPIFY_API_KEY;
    this.apiSecret = env.SHOPIFY_API_SECRET;
  }

  /**
   * Validate and decode session token (JWT)
   * Note: In production, you should verify the signature using the API secret
   */
  async validateSessionToken(token: string): Promise<SessionTokenPayload | null> {
    try {
      // Decode JWT (without verification for now - add verification in production!)
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('Invalid JWT format');
        return null;
      }

      const payload = JSON.parse(atob(parts[1]));
      
      // Basic validation
      if (!payload.dest || !payload.aud || !payload.exp) {
        console.error('Invalid session token payload');
        return null;
      }

      // Check expiry
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        console.error('Session token expired');
        return null;
      }

      // Check audience (should match API key)
      if (payload.aud !== this.apiKey) {
        console.error('Session token audience mismatch');
        return null;
      }

      return payload as SessionTokenPayload;
    } catch (error) {
      console.error('Failed to validate session token:', error);
      return null;
    }
  }

  /**
   * Extract shop domain from session token payload
   */
  getShopFromPayload(payload: SessionTokenPayload): string {
    // Extract shop from dest: https://shop-domain.myshopify.com
    const url = new URL(payload.dest);
    return url.hostname;
  }

  /**
   * Exchange session token for online access token
   * Online tokens expire after 24 hours
   */
  async exchangeForOnlineToken(sessionToken: string, shop: string): Promise<string | null> {
    try {
      const url = `https://${shop}/admin/oauth/access_token`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.apiKey,
          client_secret: this.apiSecret,
          grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
          subject_token: sessionToken,
          subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
          requested_token_type: 'urn:shopify:params:oauth:token-type:online-access-token',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Token exchange failed:', error);
        return null;
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error('Token exchange error:', error);
      return null;
    }
  }

  /**
   * Exchange session token for offline access token
   * Offline tokens don't expire (until app is uninstalled)
   */
  async exchangeForOfflineToken(sessionToken: string, shop: string): Promise<string | null> {
    try {
      const url = `https://${shop}/admin/oauth/access_token`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.apiKey,
          client_secret: this.apiSecret,
          grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
          subject_token: sessionToken,
          subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
          requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Token exchange failed:', error);
        return null;
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error('Token exchange error:', error);
      return null;
    }
  }
}

