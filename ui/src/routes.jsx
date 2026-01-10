import { useRoutes } from 'react-router-dom';
// layouts
import Home from './components/Home';
import SubscriptionGate from './components/SubscriptionGate';

// ----------------------------------------------------------------------

export default function RouteTeller() {
  return useRoutes([
    {
      path: '',
      children: [
        { 
          path: '', 
          element: (
            <SubscriptionGate>
              <Home />
            </SubscriptionGate>
          ) 
        },
      ]
    }
  ]);
}
