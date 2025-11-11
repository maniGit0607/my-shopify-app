import { Env, ShopifyOAuthResponse } from '../types';

export class ShopifyOAuth {
  private apiKey: string;
  private apiSecret: string;
  private scopes: string;
  private redirectUri: string;

  constructor(env: Env) {
    this.apiKey = env.SHOPIFY_API_KEY;
    this.apiSecret = env.SHOPIFY_API_SECRET;
    this.scopes = env.SHOPIFY_SCOPES;
    this.redirectUri = `${env.APP_URL}/auth/callback`;
  }

  /**
   * Generate the OAuth authorization URL
   */
  getAuthUrl(shop: string, state?: string): string {
    const params = new URLSearchParams({
      client_id: this.apiKey,
      scope: this.scopes,
      redirect_uri: this.redirectUri,
    });

    if (state) {
      params.append('state', state);
    }

    return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(shop: string, code: string): Promise<ShopifyOAuthResponse> {
    const url = `https://${shop}/admin/oauth/access_token`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.apiKey,
        client_secret: this.apiSecret,
        code: code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    return await response.json() as ShopifyOAuthResponse;
  }

  /**
   * Validate HMAC signature from Shopify
   */
  validateHmac(query: Record<string, string>): boolean {
    const { hmac, ...params } = query;
    
    if (!hmac) {
      return false;
    }

    // Sort parameters and create message
    const message = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    // Calculate HMAC
    const encoder = new TextEncoder();
    const key = encoder.encode(this.apiSecret);
    const data = encoder.encode(message);

    return crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ).then(cryptoKey => 
      crypto.subtle.sign('HMAC', cryptoKey, data)
    ).then(signature => {
      const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return signatureHex === hmac;
    }).catch(() => false);
  }

  /**
   * Validate shop domain format
   */
  validateShopDomain(shop: string): boolean {
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/;
    return shopRegex.test(shop);
  }
}


