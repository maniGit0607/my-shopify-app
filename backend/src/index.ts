import { Hono } from 'hono';
import { Env } from './types';
import { corsMiddleware } from './middleware/cors';
import auth from './routes/auth';
import api from './routes/api';
import webhooks from './routes/webhooks';
import insights from './routes/insights';
import feedback from './routes/feedback';
import billing from './routes/billing';

const app = new Hono<{ Bindings: Env }>();

// Apply CORS middleware
app.use('/*', corsMiddleware());

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'My Shopify App Backend',
    version: '2.0.0',
    endpoints: {
      auth: '/auth',
      callback: '/auth/callback',
      health: '/api/health',
      insights: '/insights/report',
      daily: '/insights/daily',
      products: '/insights/products',
      events: '/insights/events',
      summary: '/insights/summary',
      webhooks: '/webhooks/*',
      feedback: '/feedback/*',
      billing: '/billing/*',
    },
  });
});

// Mount routes
app.route('/auth', auth);
app.route('/api', api);
app.route('/webhooks', webhooks);
app.route('/insights', insights);
app.route('/feedback', feedback);
app.route('/billing', billing);

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


