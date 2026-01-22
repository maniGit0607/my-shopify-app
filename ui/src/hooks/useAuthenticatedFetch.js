import { useCallback } from 'react';

/**
 * Custom hook for making authenticated requests to backend
 * Automatically includes session token from App Bridge in Authorization header
 */
export function useAuthenticatedFetch() {
  const makeRequest = useCallback(async (url, options = {}) => {
    try {
      // Get session token from App Bridge
      if (!window.shopify) {
        throw new Error('App Bridge not loaded');
      }

      console.log('[Auth Fetch] Getting session token from App Bridge');
      const sessionToken = await window.shopify.idToken();
      console.log('[Auth Fetch] Session token obtained');

      // Merge headers with authorization
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
        ...options.headers,
      };

      // Make request with session token
      const response = await fetch(url, {
        ...options,
        headers,
      });

      return response;
    } catch (error) {
      console.error('[Auth Fetch] Error:', error);
      throw error;
    }
  }, []);

  return makeRequest;
}

