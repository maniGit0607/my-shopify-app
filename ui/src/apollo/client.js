import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

// Backend GraphQL endpoint
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';

/**
 * Create Apollo Client with authenticated fetch from App Bridge
 * The authenticatedFetch is provided by App Bridge v4 and automatically
 * includes session tokens in all requests
 */
export function createApolloClient(authenticatedFetch) {
  const httpLink = new HttpLink({
    uri: `${BACKEND_URL}/api/graphql`,
    fetch: authenticatedFetch, // Use App Bridge's authenticated fetch
  });

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'network-only', // Always fetch fresh data
      },
      query: {
        fetchPolicy: 'network-only',
      },
    },
  });
}


