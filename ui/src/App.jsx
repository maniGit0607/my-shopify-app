import { AppProvider } from '@shopify/polaris';
import RouteTeller from './routes';
import { BrowserRouter } from 'react-router-dom';
import "@shopify/polaris/build/esm/styles.css"
import en from "@shopify/polaris/locales/en.json";

function App() {
  // With App Bridge v4 loaded via CDN script, we don't need Provider component
  // The script handles everything globally based on meta tag
  
  const host = new URLSearchParams(window.location.search).get("host");
  const shop = new URLSearchParams(window.location.search).get("shop");
  
  // Check if app is running in Shopify Admin (embedded)
  if (!host || !shop) {
    console.warn('App may not be embedded - missing host/shop parameters');
    console.log('Host:', host, 'Shop:', shop);
  } else {
    console.log('App embedded in Shopify Admin for shop:', shop);
  }

  return (
    <BrowserRouter>
      <AppProvider i18n={en}>
        <RouteTeller />
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
