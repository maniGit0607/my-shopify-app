import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge/utilities';
import { useCallback } from 'react';

// Backend API URL - update this with your Cloudflare Worker URL after deployment
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';

export function useShopifyFetch() {
  const app = useAppBridge();

  const shopifyFetch = useCallback(async (url, options = {}) => {
    try {
      // Get session token from App Bridge
      const token = await getSessionToken(app);
      
      // Convert shopify: protocol to backend API endpoint
      let apiUrl = url;
      if (url.startsWith('shopify:admin/api/graphql.json')) {
        apiUrl = `${BACKEND_URL}/api/graphql`;
      } else if (url.startsWith('shopify:')) {
        // For other Shopify API calls, also proxy through backend
        apiUrl = url.replace('shopify:', `${BACKEND_URL}/api`);
      }
      
      // Prepare headers with session token
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Make the fetch request to backend
      const response = await fetch(apiUrl, {
        ...options,
        headers,
      });

      return response;
    } catch (error) {
      console.error('Backend fetch error:', error);
      throw error;
    }
  }, [app]);

  return shopifyFetch;
}

