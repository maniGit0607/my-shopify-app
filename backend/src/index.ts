import { Hono } from 'hono';
import { Env } from './types';
import { corsMiddleware } from './middleware/cors';
import auth from './routes/auth';
import api from './routes/api';

const app = new Hono<{ Bindings: Env }>();

// Apply CORS middleware
app.use('/*', corsMiddleware());

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'My Shopify App Backend',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      callback: '/auth/callback',
      graphql: '/api/graphql',
      health: '/api/health',
    },
  });
});

// Mount routes
app.route('/auth', auth);
app.route('/api', api);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    error: 'Internal server error',
    message: err.message,
  }, 500);
});

export default app;


