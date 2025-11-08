import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge/utilities';
import { useCallback } from 'react';

export function useShopifyFetch() {
  const app = useAppBridge();

  const shopifyFetch = useCallback(async (url, options = {}) => {
    try {
      // Get session token from App Bridge
      const token = await getSessionToken(app);
      
      // Convert shopify: protocol to actual Shopify API URL
      let apiUrl = url;
      if (url.startsWith('shopify:')) {
        // Get the shop domain from URL params
        const shopParam = new URLSearchParams(window.location.search).get('shop');
        if (!shopParam) {
          throw new Error('Shop parameter not found in URL');
        }
        // Replace shopify: with actual shop domain
        apiUrl = url.replace('shopify:', `https://${shopParam}`);
      }
      
      // Prepare headers
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Make the fetch request
      const response = await fetch(apiUrl, {
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

