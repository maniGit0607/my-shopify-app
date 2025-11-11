import { useCallback } from 'react';

// Backend API URL - update this with your Cloudflare Worker URL after deployment
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';

/**
 * Hook for making authenticated requests to backend
 * With App Bridge v4, session tokens are automatically injected by the CDN script
 */
export function useShopifyFetch() {
  const shopifyFetch = useCallback(async (url, options = {}) => {
    try {
      // Convert shopify: protocol to backend API endpoint
      let apiUrl = url;
      if (url.startsWith('shopify:admin/api/graphql.json')) {
        apiUrl = `${BACKEND_URL}/api/graphql`;
      } else if (url.startsWith('shopify:')) {
        // For other Shopify API calls, also proxy through backend
        apiUrl = url.replace('shopify:', `${BACKEND_URL}/api`);
      }
      
      console.log('Calling backend:', apiUrl);
      
      // App Bridge v4 automatically adds Authorization header with session token
      // Just make the fetch request normally
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Make the fetch request - App Bridge intercepts and adds session token
      const response = await fetch(apiUrl, {
        ...options,
        headers,
      });

      console.log('Backend response:', response.status);
      
      // Extract session token from headers if needed for backend
      const authHeader = response.headers.get('Authorization');
      if (authHeader) {
        console.log('Session token present in request');
      }
      
      return response;
    } catch (error) {
      console.error('Backend fetch error:', error);
      throw error;
    }
  }, []);

  return shopifyFetch;
}

