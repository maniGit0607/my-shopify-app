import { Hono } from 'hono';
import { Env, ShopifyOrder, ShopifyRefund } from '../types';
import { MetricsService } from '../services/metrics-service';
import crypto from 'crypto';

const webhooks = new Hono<{ Bindings: Env }>();

/**
 * Verify Shopify webhook signature
 */
async function verifyWebhookSignature(
  body: string,
  signature: string | undefined,
  secret: string
): Promise<boolean> {
  if (!signature) return false;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );
  
  const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
  return signature === computedSignature;
}

/**
 * Extract shop domain from Shopify webhook headers
 */
function getShopFromHeaders(c: any): string {
  return c.req.header('X-Shopify-Shop-Domain') || '';
}

/**
 * Get webhook ID for deduplication
 */
function getWebhookId(c: any): string {
  return c.req.header('X-Shopify-Webhook-Id') || '';
}

/**
 * Extract date (YYYY-MM-DD) from ISO timestamp
 */
function extractDate(isoTimestamp: string): string {
  return isoTimestamp.split('T')[0];
}

/**
 * POST /webhooks/orders/create
 * Handle new order creation
 */
webhooks.post('/orders/create', async (c) => {
  const shop = getShopFromHeaders(c);
  const webhookId = getWebhookId(c);
  const rawBody = await c.req.text();
  
  // Verify webhook signature
  const signature = c.req.header('X-Shopify-Hmac-Sha256');
  const isValid = await verifyWebhookSignature(rawBody, signature, c.env.SHOPIFY_API_SECRET);
  
  if (!isValid) {
    console.error('[Webhook] Invalid signature for orders/create');
    return c.json({ error: 'Invalid signature' }, 401);
  }

  try {
    const metricsService = new MetricsService(c.env);
    
    // Check for duplicate webhook
    if (await metricsService.isWebhookProcessed(shop, webhookId)) {
      console.log(`[Webhook] Duplicate webhook ${webhookId}, skipping`);
      return c.json({ status: 'already_processed' });
    }

    const order: ShopifyOrder = JSON.parse(rawBody);
    const date = extractDate(order.created_at);
    
    console.log(`[Webhook] Processing order ${order.id} for shop ${shop} on ${date}`);

    // Determine if new or returning customer
    const isNewCustomer = order.customer ? order.customer.orders_count <= 1 : true;
    
    // Calculate totals
    const revenue = parseFloat(order.total_price);
    const discounts = parseFloat(order.total_discounts);
    const hasDiscount = discounts > 0;
    const itemsSold = order.line_items.reduce((sum, item) => sum + item.quantity, 0);

    // Update daily metrics
    await metricsService.incrementDailyMetrics(shop, date, {
      revenue,
      orders: 1,
      newCustomerOrders: isNewCustomer ? 1 : 0,
      returningCustomerOrders: isNewCustomer ? 0 : 1,
      itemsSold,
      discounts,
      ordersWithDiscount: hasDiscount ? 1 : 0,
    });

    // Update product metrics
    for (const item of order.line_items) {
      await metricsService.incrementProductMetrics(
        shop,
        date,
        String(item.product_id),
        item.title,
        String(item.variant_id),
        item.variant_title || 'Default',
        {
          unitsSold: item.quantity,
          revenue: parseFloat(item.price) * item.quantity,
          discountAmount: parseFloat(item.total_discount),
        }
      );
    }

    // Update customer metrics
    await metricsService.incrementCustomerMetrics(shop, date, {
      newCustomers: isNewCustomer ? 1 : 0,
      returningCustomers: isNewCustomer ? 0 : 1,
    });

    // Update order breakdown metrics
    // Channel breakdown
    const channel = order.source_name || 'unknown';
    await metricsService.incrementOrderBreakdown(shop, date, 'channel', channel, {
      orderCount: 1,
      revenue,
    });

    // Payment method breakdown
    const paymentMethod = order.payment_gateway_names?.[0] || 'unknown';
    await metricsService.incrementOrderBreakdown(shop, date, 'payment_method', paymentMethod, {
      orderCount: 1,
      revenue,
    });

    // Status breakdown (initial status is typically unfulfilled)
    const status = order.fulfillment_status || 'unfulfilled';
    await metricsService.incrementOrderBreakdown(shop, date, 'status', status, {
      orderCount: 1,
      revenue,
    });

    // Discount breakdown
    const discountStatus = hasDiscount ? 'with_discount' : 'without_discount';
    await metricsService.incrementOrderBreakdown(shop, date, 'discount', discountStatus, {
      orderCount: 1,
      revenue,
    });

    // Log significant events
    if (revenue > 500) {
      await metricsService.logEvent({
        shop,
        date,
        event_type: 'large_order',
        description: `Large order #${order.order_number} ($${revenue.toFixed(2)})`,
        impact_amount: revenue,
        metadata: JSON.stringify({ order_id: order.id, order_number: order.order_number }),
      });
    }

    // Mark webhook as processed
    await metricsService.markWebhookProcessed(shop, webhookId, 'orders/create');

    console.log(`[Webhook] Successfully processed order ${order.id}`);
    return c.json({ status: 'processed' });

  } catch (error) {
    console.error('[Webhook] Error processing orders/create:', error);
    return c.json({ error: 'Processing failed' }, 500);
  }
});

/**
 * POST /webhooks/orders/updated
 * Handle order updates (primarily for status changes)
 */
webhooks.post('/orders/updated', async (c) => {
  const shop = getShopFromHeaders(c);
  const webhookId = getWebhookId(c);
  const rawBody = await c.req.text();
  
  // Verify webhook signature
  const signature = c.req.header('X-Shopify-Hmac-Sha256');
  const isValid = await verifyWebhookSignature(rawBody, signature, c.env.SHOPIFY_API_SECRET);
  
  if (!isValid) {
    console.error('[Webhook] Invalid signature for orders/updated');
    return c.json({ error: 'Invalid signature' }, 401);
  }

  try {
    const metricsService = new MetricsService(c.env);
    
    // For updates, we allow reprocessing but log it
    const order: ShopifyOrder = JSON.parse(rawBody);
    console.log(`[Webhook] Order ${order.id} updated for shop ${shop}`);

    // We primarily track updates for logging significant changes
    // The main metrics are captured at order creation
    
    return c.json({ status: 'acknowledged' });

  } catch (error) {
    console.error('[Webhook] Error processing orders/updated:', error);
    return c.json({ error: 'Processing failed' }, 500);
  }
});

/**
 * POST /webhooks/orders/cancelled
 * Handle order cancellations
 */
webhooks.post('/orders/cancelled', async (c) => {
  const shop = getShopFromHeaders(c);
  const webhookId = getWebhookId(c);
  const rawBody = await c.req.text();
  
  // Verify webhook signature
  const signature = c.req.header('X-Shopify-Hmac-Sha256');
  const isValid = await verifyWebhookSignature(rawBody, signature, c.env.SHOPIFY_API_SECRET);
  
  if (!isValid) {
    console.error('[Webhook] Invalid signature for orders/cancelled');
    return c.json({ error: 'Invalid signature' }, 401);
  }

  try {
    const metricsService = new MetricsService(c.env);
    
    // Check for duplicate webhook
    if (await metricsService.isWebhookProcessed(shop, webhookId)) {
      console.log(`[Webhook] Duplicate webhook ${webhookId}, skipping`);
      return c.json({ status: 'already_processed' });
    }

    const order: ShopifyOrder = JSON.parse(rawBody);
    // Use ORDER CREATION date, not cancellation date
    // This ensures cancelled revenue offsets the original revenue on the same day
    const date = extractDate(order.created_at);
    const revenue = parseFloat(order.total_price);
    
    console.log(`[Webhook] Processing cancellation for order ${order.id} (created ${date}, cancelled ${order.cancelled_at})`);

    // Update daily metrics with cancellation
    await metricsService.incrementDailyMetrics(shop, date, {
      cancelledOrders: 1,
      cancelledRevenue: revenue,
    });

    // Log the cancellation event (use cancellation date for the event log)
    const cancellationDate = order.cancelled_at ? extractDate(order.cancelled_at) : date;
    await metricsService.logEvent({
      shop,
      date: cancellationDate,
      event_type: 'order_cancelled',
      description: `Order #${order.order_number} cancelled ($${revenue.toFixed(2)}) - originally placed ${date}`,
      impact_amount: -revenue,
      metadata: JSON.stringify({ order_id: order.id, order_number: order.order_number, original_date: date }),
    });

    // Mark webhook as processed
    await metricsService.markWebhookProcessed(shop, webhookId, 'orders/cancelled');

    console.log(`[Webhook] Successfully processed cancellation for order ${order.id}`);
    return c.json({ status: 'processed' });

  } catch (error) {
    console.error('[Webhook] Error processing orders/cancelled:', error);
    return c.json({ error: 'Processing failed' }, 500);
  }
});

/**
 * POST /webhooks/refunds/create
 * Handle refund creation
 */
webhooks.post('/refunds/create', async (c) => {
  const shop = getShopFromHeaders(c);
  const webhookId = getWebhookId(c);
  const rawBody = await c.req.text();
  
  // Verify webhook signature
  const signature = c.req.header('X-Shopify-Hmac-Sha256');
  const isValid = await verifyWebhookSignature(rawBody, signature, c.env.SHOPIFY_API_SECRET);
  
  if (!isValid) {
    console.error('[Webhook] Invalid signature for refunds/create');
    return c.json({ error: 'Invalid signature' }, 401);
  }

  try {
    const metricsService = new MetricsService(c.env);
    
    // Check for duplicate webhook
    if (await metricsService.isWebhookProcessed(shop, webhookId)) {
      console.log(`[Webhook] Duplicate webhook ${webhookId}, skipping`);
      return c.json({ status: 'already_processed' });
    }

    const refund: ShopifyRefund = JSON.parse(rawBody);
    const date = extractDate(refund.created_at);
    
    // Calculate total refund amount
    const refundAmount = refund.transactions?.reduce(
      (sum, t) => sum + parseFloat(t.amount), 
      0
    ) || 0;
    
    console.log(`[Webhook] Processing refund ${refund.id} for $${refundAmount} on ${date}`);

    // Update daily metrics with refund
    await metricsService.incrementDailyMetrics(shop, date, {
      refunds: refundAmount,
      refundCount: 1,
    });

    // Log significant refunds
    if (refundAmount > 100) {
      await metricsService.logEvent({
        shop,
        date,
        event_type: 'significant_refund',
        description: `Refund of $${refundAmount.toFixed(2)} processed`,
        impact_amount: -refundAmount,
        metadata: JSON.stringify({ refund_id: refund.id, order_id: refund.order_id }),
      });
    }

    // Mark webhook as processed
    await metricsService.markWebhookProcessed(shop, webhookId, 'refunds/create');

    console.log(`[Webhook] Successfully processed refund ${refund.id}`);
    return c.json({ status: 'processed' });

  } catch (error) {
    console.error('[Webhook] Error processing refunds/create:', error);
    return c.json({ error: 'Processing failed' }, 500);
  }
});

export default webhooks;

