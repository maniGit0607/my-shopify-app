import { useRoutes } from 'react-router-dom';
// layouts
import Home from './components/Home';

// ----------------------------------------------------------------------

export default function RouteTeller() {
  return useRoutes([
    {
      path: '',
      children: [
        { path: '', element: <Home /> },
      ]
    }
  ]);
}
