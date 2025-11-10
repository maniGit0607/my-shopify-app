import { AppProvider } from '@shopify/polaris';
import RouteTeller from './routes';
import { NavMenu, Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import { BrowserRouter } from 'react-router-dom';
import "@shopify/polaris/build/esm/styles.css"
import en from "@shopify/polaris/locales/en.json";

function App() {
  const host = new URLSearchParams(window.location.search).get("host");
  
  const config = {
    apiKey: "3c333541b1807a90350f6d829e13cd9b",
    host: host,
    forceRedirect: true,
  };

  return (
    <BrowserRouter>
      <AppBridgeProvider config={config}>
        <AppProvider i18n={en}>
          <RouteTeller />
        </AppProvider>
      </AppBridgeProvider>
    </BrowserRouter>
  );
}

export default App;
