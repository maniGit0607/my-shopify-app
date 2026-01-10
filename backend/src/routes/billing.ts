import { Hono } from 'hono';
import { Env } from '../types';
import { validateSessionToken, getShop } from '../middleware/session-token';

const billing = new Hono<{ Bindings: Env }>();

// Plan configuration
const PLAN_CONFIG = {
  name: 'Pro Plan',
  price: 5.00,
  currency: 'USD',
  trialDays: 3,
  interval: 'EVERY_30_DAYS',
};

// Apply session token validation
billing.use('/*', validateSessionToken);

/**
 * Helper to get access token for a shop
 */
async function getAccessToken(env: Env, shop: string): Promise<string | null> {
  const tokenData = await env.SHOP_TOKENS.get(shop);
  if (!tokenData) return null;
  const parsed = JSON.parse(tokenData);
  return parsed.accessToken;
}

/**
 * Helper to make Shopify GraphQL requests
 */
async function shopifyGraphQL(shop: string, accessToken: string, query: string, variables?: any) {
  const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  return response.json();
}

/**
 * GET /billing/status
 * Get current subscription status for the shop
 */
billing.get('/status', async (c) => {
  const shop = getShop(c);
  if (!shop) return c.json({ error: 'Shop not found' }, 401);

  try {
    // Get subscription from database
    const subscription = await c.env.ANALYTICS_DB.prepare(
      `SELECT * FROM subscriptions WHERE shop = ?`
    ).bind(shop).first();

    if (!subscription) {
      // No subscription record - new user
      return c.json({
        hasSubscription: false,
        status: 'none',
        requiresSubscription: true,
        canAccessApp: false,
        message: 'Start your free trial to access the app',
      });
    }

    const now = new Date();
    const status = subscription.status as string;

    // Check trial status
    if (status === 'trial') {
      const trialEnds = new Date(subscription.trial_ends_at as string);
      const trialActive = now < trialEnds;
      const daysRemaining = Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      return c.json({
        hasSubscription: true,
        status: trialActive ? 'trial' : 'trial_expired',
        canAccessApp: trialActive,
        trialEndsAt: subscription.trial_ends_at,
        daysRemaining,
        message: trialActive 
          ? `Trial active - ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
          : 'Trial expired. Please subscribe to continue.',
        plan: {
          name: PLAN_CONFIG.name,
          price: PLAN_CONFIG.price,
          currency: PLAN_CONFIG.currency,
        },
      });
    }

    // Check active subscription
    if (status === 'active') {
      const periodEnd = subscription.current_period_end 
        ? new Date(subscription.current_period_end as string) 
        : null;

      return c.json({
        hasSubscription: true,
        status: 'active',
        canAccessApp: true,
        currentPeriodEnd: subscription.current_period_end,
        message: 'Subscription active',
        plan: {
          name: PLAN_CONFIG.name,
          price: PLAN_CONFIG.price,
          currency: PLAN_CONFIG.currency,
        },
      });
    }

    // Cancelled or expired
    return c.json({
      hasSubscription: true,
      status: status,
      canAccessApp: false,
      cancelledAt: subscription.cancelled_at,
      message: status === 'cancelled' 
        ? 'Subscription cancelled. Please resubscribe to continue.'
        : 'Subscription expired. Please resubscribe to continue.',
      plan: {
        name: PLAN_CONFIG.name,
        price: PLAN_CONFIG.price,
        currency: PLAN_CONFIG.currency,
      },
    });

  } catch (error) {
    console.error('[Billing] Error checking status:', error);
    return c.json({ error: 'Failed to check subscription status' }, 500);
  }
});

/**
 * POST /billing/start-trial
 * Start a free trial for the shop
 */
billing.post('/start-trial', async (c) => {
  const shop = getShop(c);
  if (!shop) return c.json({ error: 'Shop not found' }, 401);

  try {
    // Check if already has subscription
    const existing = await c.env.ANALYTICS_DB.prepare(
      `SELECT * FROM subscriptions WHERE shop = ?`
    ).bind(shop).first();

    if (existing) {
      return c.json({ 
        error: 'Trial already used',
        message: 'You have already used your free trial. Please subscribe to continue.',
      }, 400);
    }

    // Create trial subscription
    const now = new Date();
    const trialEnds = new Date(now.getTime() + (PLAN_CONFIG.trialDays * 24 * 60 * 60 * 1000));

    await c.env.ANALYTICS_DB.prepare(
      `INSERT INTO subscriptions (shop, plan_name, price, currency, status, trial_starts_at, trial_ends_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'trial', ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      shop,
      PLAN_CONFIG.name,
      PLAN_CONFIG.price,
      PLAN_CONFIG.currency,
      now.toISOString(),
      trialEnds.toISOString()
    ).run();

    return c.json({
      success: true,
      status: 'trial',
      trialEndsAt: trialEnds.toISOString(),
      daysRemaining: PLAN_CONFIG.trialDays,
      message: `Trial started! You have ${PLAN_CONFIG.trialDays} days free access.`,
    });

  } catch (error) {
    console.error('[Billing] Error starting trial:', error);
    return c.json({ error: 'Failed to start trial' }, 500);
  }
});

/**
 * POST /billing/subscribe
 * Create a Shopify subscription and return confirmation URL
 */
billing.post('/subscribe', async (c) => {
  const shop = getShop(c);
  if (!shop) return c.json({ error: 'Shop not found' }, 401);

  try {
    const accessToken = await getAccessToken(c.env, shop);
    if (!accessToken) {
      return c.json({ error: 'Access token not found' }, 401);
    }

    // Create subscription via Shopify Billing API
    const mutation = `
      mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          test: $test
          lineItems: $lineItems
        ) {
          appSubscription {
            id
            status
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }
    `;

    const returnUrl = `${c.env.APP_URL}/billing/callback?shop=${encodeURIComponent(shop)}`;

    const variables = {
      name: PLAN_CONFIG.name,
      returnUrl,
      test: true, // Set to false in production!
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: PLAN_CONFIG.price,
                currencyCode: PLAN_CONFIG.currency,
              },
              interval: PLAN_CONFIG.interval,
            },
          },
        },
      ],
    };

    const result = await shopifyGraphQL(shop, accessToken, mutation, variables);

    if (result.errors) {
      console.error('[Billing] GraphQL errors:', result.errors);
      return c.json({ error: 'Failed to create subscription', details: result.errors }, 500);
    }

    const { appSubscriptionCreate } = result.data;

    if (appSubscriptionCreate.userErrors?.length > 0) {
      console.error('[Billing] User errors:', appSubscriptionCreate.userErrors);
      return c.json({ 
        error: 'Failed to create subscription',
        details: appSubscriptionCreate.userErrors,
      }, 400);
    }

    // Store pending subscription
    const subscriptionId = appSubscriptionCreate.appSubscription.id;

    await c.env.ANALYTICS_DB.prepare(
      `INSERT INTO subscriptions (shop, shopify_subscription_id, plan_name, price, currency, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
       ON CONFLICT(shop) DO UPDATE SET
         shopify_subscription_id = excluded.shopify_subscription_id,
         status = 'pending',
         updated_at = datetime('now')`
    ).bind(
      shop,
      subscriptionId,
      PLAN_CONFIG.name,
      PLAN_CONFIG.price,
      PLAN_CONFIG.currency
    ).run();

    return c.json({
      success: true,
      confirmationUrl: appSubscriptionCreate.confirmationUrl,
      message: 'Redirect user to confirmation URL',
    });

  } catch (error) {
    console.error('[Billing] Error creating subscription:', error);
    return c.json({ error: 'Failed to create subscription' }, 500);
  }
});

/**
 * GET /billing/callback
 * Handle callback after user confirms/declines subscription
 */
billing.get('/callback', async (c) => {
  const shop = c.req.query('shop');
  const chargeId = c.req.query('charge_id');

  if (!shop) {
    return c.redirect(`${c.env.FRONTEND_URL}?error=missing_shop`);
  }

  try {
    const accessToken = await getAccessToken(c.env, shop);
    if (!accessToken) {
      return c.redirect(`${c.env.FRONTEND_URL}?error=auth_failed`);
    }

    // Query current subscription status from Shopify
    const query = `
      query {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            currentPeriodEnd
            trialDays
          }
        }
      }
    `;

    const result = await shopifyGraphQL(shop, accessToken, query);

    if (result.errors) {
      console.error('[Billing] Error checking subscription:', result.errors);
      return c.redirect(`${c.env.FRONTEND_URL}?error=subscription_check_failed`);
    }

    const activeSubscriptions = result.data?.currentAppInstallation?.activeSubscriptions || [];
    const activeSubscription = activeSubscriptions.find((s: any) => s.status === 'ACTIVE');

    if (activeSubscription) {
      // Subscription activated successfully
      const now = new Date();
      const periodEnd = activeSubscription.currentPeriodEnd 
        ? new Date(activeSubscription.currentPeriodEnd)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await c.env.ANALYTICS_DB.prepare(
        `UPDATE subscriptions 
         SET shopify_subscription_id = ?,
             status = 'active',
             billing_starts_at = ?,
             current_period_end = ?,
             updated_at = datetime('now')
         WHERE shop = ?`
      ).bind(
        activeSubscription.id,
        now.toISOString(),
        periodEnd.toISOString(),
        shop
      ).run();

      return c.redirect(`${c.env.FRONTEND_URL}?subscription=active`);
    } else {
      // User declined or subscription not active
      await c.env.ANALYTICS_DB.prepare(
        `UPDATE subscriptions 
         SET status = 'cancelled',
             cancelled_at = datetime('now'),
             updated_at = datetime('now')
         WHERE shop = ? AND status = 'pending'`
      ).bind(shop).run();

      return c.redirect(`${c.env.FRONTEND_URL}?subscription=declined`);
    }

  } catch (error) {
    console.error('[Billing] Callback error:', error);
    return c.redirect(`${c.env.FRONTEND_URL}?error=callback_failed`);
  }
});

/**
 * POST /billing/cancel
 * Cancel the current subscription
 */
billing.post('/cancel', async (c) => {
  const shop = getShop(c);
  if (!shop) return c.json({ error: 'Shop not found' }, 401);

  try {
    const subscription = await c.env.ANALYTICS_DB.prepare(
      `SELECT * FROM subscriptions WHERE shop = ? AND status = 'active'`
    ).bind(shop).first();

    if (!subscription || !subscription.shopify_subscription_id) {
      return c.json({ error: 'No active subscription found' }, 404);
    }

    const accessToken = await getAccessToken(c.env, shop);
    if (!accessToken) {
      return c.json({ error: 'Access token not found' }, 401);
    }

    // Cancel via Shopify API
    const mutation = `
      mutation AppSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const result = await shopifyGraphQL(shop, accessToken, mutation, {
      id: subscription.shopify_subscription_id,
    });

    if (result.errors || result.data?.appSubscriptionCancel?.userErrors?.length > 0) {
      console.error('[Billing] Cancel errors:', result.errors || result.data?.appSubscriptionCancel?.userErrors);
      return c.json({ error: 'Failed to cancel subscription' }, 500);
    }

    // Update local record
    await c.env.ANALYTICS_DB.prepare(
      `UPDATE subscriptions 
       SET status = 'cancelled',
           cancelled_at = datetime('now'),
           updated_at = datetime('now')
       WHERE shop = ?`
    ).bind(shop).run();

    return c.json({
      success: true,
      message: 'Subscription cancelled successfully',
    });

  } catch (error) {
    console.error('[Billing] Error cancelling:', error);
    return c.json({ error: 'Failed to cancel subscription' }, 500);
  }
});

/**
 * GET /billing/check-access
 * Quick check if user can access the app (for middleware)
 */
billing.get('/check-access', async (c) => {
  const shop = getShop(c);
  if (!shop) return c.json({ canAccess: false, reason: 'no_shop' });

  try {
    const subscription = await c.env.ANALYTICS_DB.prepare(
      `SELECT status, trial_ends_at FROM subscriptions WHERE shop = ?`
    ).bind(shop).first();

    if (!subscription) {
      return c.json({ canAccess: false, reason: 'no_subscription' });
    }

    const status = subscription.status as string;

    if (status === 'active') {
      return c.json({ canAccess: true, status: 'active' });
    }

    if (status === 'trial') {
      const trialEnds = new Date(subscription.trial_ends_at as string);
      const now = new Date();
      if (now < trialEnds) {
        return c.json({ canAccess: true, status: 'trial' });
      }
      return c.json({ canAccess: false, reason: 'trial_expired' });
    }

    return c.json({ canAccess: false, reason: status });

  } catch (error) {
    console.error('[Billing] Check access error:', error);
    return c.json({ canAccess: false, reason: 'error' });
  }
});

export default billing;

