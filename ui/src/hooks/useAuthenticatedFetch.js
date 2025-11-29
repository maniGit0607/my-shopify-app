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

/**
 * Hook for making GraphQL requests to backend
 * Automatically handles session token and formatting
 */
export function useGraphQLFetch() {
  const authenticatedFetch = useAuthenticatedFetch();
  
  const makeGraphQLRequest = useCallback(async (query, variables = {}) => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';
    
    try {
      console.log('[GraphQL Fetch] Making request to:', `${BACKEND_URL}/api/graphql`);
      
      const response = await authenticatedFetch(`${BACKEND_URL}/api/graphql`, {
        method: 'POST',
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[GraphQL Fetch] Error response:', error);
        throw new Error(error.error || `Request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[GraphQL Fetch] Success');
      
      return data;
    } catch (error) {
      console.error('[GraphQL Fetch] Request failed:', error);
      throw error;
    }
  }, [authenticatedFetch]);

  return makeGraphQLRequest;
}

