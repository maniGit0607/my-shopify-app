import { Context } from 'hono';
import { cors as honoCors } from 'hono/cors';

/**
 * CORS middleware configuration for frontend
 */
export function corsMiddleware() {
  return honoCors({
    origin: (origin) => {
      // Allow requests from Shopify Admin and your frontend
      const allowedOrigins = [
        /.*\.myshopify\.com$/,
        /.*\.shopify\.com$/,
        'http://localhost:5173',
        'http://localhost:3000',
      ];

      if (!origin) return '*'; // Allow requests with no origin (like from Postman)
      
      for (const allowed of allowedOrigins) {
        if (typeof allowed === 'string' && origin === allowed) {
          return origin;
        }
        if (allowed instanceof RegExp && allowed.test(origin)) {
          return origin;
        }
      }
      
      return origin; // Allow all in development
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  });
}


