import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider, useAuthenticatedFetch } from '@shopify/app-bridge-react';
import { ApolloProvider } from '@apollo/client';
import RouteTeller from './routes';
import { BrowserRouter } from 'react-router-dom';
import { createApolloClient } from './apollo/client';
import "@shopify/polaris/build/esm/styles.css"
import en from "@shopify/polaris/locales/en.json";

/**
 * Apollo Wrapper that uses App Bridge's authenticated fetch
 * This component must be inside AppBridgeProvider to access authenticatedFetch
 */
function ApolloWrapper({ children }) {
  // Get authenticated fetch from App Bridge - automatically includes session tokens
  const authenticatedFetch = useAuthenticatedFetch();
  
  // Create Apollo Client with authenticated fetch
  const apolloClient = createApolloClient(authenticatedFetch);

  return (
    <ApolloProvider client={apolloClient}>
      {children}
    </ApolloProvider>
  );
}

function App() {
  const host = new URLSearchParams(window.location.search).get("host");
  const shop = new URLSearchParams(window.location.search).get("shop");
  
  // Check if app is running in Shopify Admin (embedded)
  if (!host || !shop) {
    console.warn('App may not be embedded - missing host/shop parameters');
    console.log('Host:', host, 'Shop:', shop);
  } else {
    console.log('App embedded in Shopify Admin for shop:', shop);
  }

  // App Bridge v4 config - works with CDN script
  const appBridgeConfig = {
    apiKey: 'adf09a15971e32d6d1af341d9c0a7d14',
    host: host || '',
    forceRedirect: true,
  };

  return (
    <BrowserRouter>
      <AppBridgeProvider config={appBridgeConfig}>
        <ApolloWrapper>
          <AppProvider i18n={en}>
            <RouteTeller />
          </AppProvider>
        </ApolloWrapper>
      </AppBridgeProvider>
    </BrowserRouter>
  );
}

export default App;
