export interface Env {
  SHOPIFY_API_KEY: string;
  SHOPIFY_API_SECRET: string;
  SHOPIFY_SCOPES: string;
  APP_URL: string;
  FRONTEND_URL: string;
  SHOP_TOKENS: KVNamespace;
}

export interface ShopTokenData {
  accessToken: string;
  scope: string;
  installedAt: string;
  shop: string;
}

export interface SessionTokenPayload {
  iss: string;  // https://shop-domain.myshopify.com/admin
  dest: string; // https://shop-domain.myshopify.com
  aud: string;  // API key
  sub: string;  // User ID
  exp: number;  // Expiry
  nbf: number;  // Not before
  iat: number;  // Issued at
  jti: string;  // JWT ID
  sid: string;  // Session ID
}

export interface ShopifyOAuthResponse {
  access_token: string;
  scope: string;
}


