import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge/utilities';
import { useCallback } from 'react';

export function useShopifyFetch() {
  const app = useAppBridge();

  const shopifyFetch = useCallback(async (url, options = {}) => {
    try {
      // Get session token from App Bridge
      const token = await getSessionToken(app);
      
      // Prepare headers
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Make the fetch request
      const response = await fetch(url, {
        ...options,
        headers,
      });

      return response;
    } catch (error) {
      console.error('Shopify fetch error:', error);
      throw error;
    }
  }, [app]);

  return shopifyFetch;
}

