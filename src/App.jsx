import { AppProvider } from '@shopify/polaris';
import RouteTeller from './routes';
import { NavMenu } from '@shopify/app-bridge-react';
import { BrowserRouter } from 'react-router-dom';
import "@shopify/polaris/build/esm/styles.css"
import en from "@shopify/polaris/locales/en.json";

function App() {
  return (
    <AppProvider i18n={en}>
      <BrowserRouter>
      <RouteTeller />
      <NavMenu>
        <a href="" rel="home">Home</a>
      </NavMenu>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
