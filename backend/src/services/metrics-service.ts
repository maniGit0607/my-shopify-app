import { 
  Env, 
  DailyMetrics, 
  DailyProductMetrics, 
  DailyCustomerMetrics,
  ShopEvent,
  PeriodMetrics,
  ProductPeriodMetrics,
  OrderBreakdownType,
  DailyOrderBreakdown,
  AggregatedOrderBreakdown
} from '../types';

/**
 * Service for managing analytics metrics in D1 database
 */
export class MetricsService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = env.ANALYTICS_DB;
  }

  // ============ Daily Metrics CRUD ============

  /**
   * Get daily metrics for a specific date
   */
  async getDailyMetrics(shop: string, date: string): Promise<DailyMetrics | null> {
    const result = await this.db.prepare(
      'SELECT * FROM daily_metrics WHERE shop = ? AND date = ?'
    ).bind(shop, date).first<DailyMetrics>();
    return result;
  }

  /**
   * Get daily metrics for a date range
   */
  async getDailyMetricsRange(shop: string, startDate: string, endDate: string): Promise<DailyMetrics[]> {
    const result = await this.db.prepare(
      'SELECT * FROM daily_metrics WHERE shop = ? AND date >= ? AND date <= ? ORDER BY date ASC'
    ).bind(shop, startDate, endDate).all<DailyMetrics>();
    return result.results || [];
  }

  /**
   * Upsert daily metrics (insert or update)
   */
  async upsertDailyMetrics(metrics: Partial<DailyMetrics> & { shop: string; date: string }): Promise<void> {
    const existing = await this.getDailyMetrics(metrics.shop, metrics.date);
    
    if (existing) {
      // Update existing record
      await this.db.prepare(`
        UPDATE daily_metrics SET
          total_revenue = ?,
          total_orders = ?,
          average_order_value = ?,
          new_customer_orders = ?,
          returning_customer_orders = ?,
          total_items_sold = ?,
          total_discounts = ?,
          orders_with_discount = ?,
          total_refunds = ?,
          refund_count = ?,
          cancelled_orders = ?,
          cancelled_revenue = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE shop = ? AND date = ?
      `).bind(
        metrics.total_revenue ?? existing.total_revenue,
        metrics.total_orders ?? existing.total_orders,
        metrics.average_order_value ?? existing.average_order_value,
        metrics.new_customer_orders ?? existing.new_customer_orders,
        metrics.returning_customer_orders ?? existing.returning_customer_orders,
        metrics.total_items_sold ?? existing.total_items_sold,
        metrics.total_discounts ?? existing.total_discounts,
        metrics.orders_with_discount ?? existing.orders_with_discount,
        metrics.total_refunds ?? existing.total_refunds,
        metrics.refund_count ?? existing.refund_count,
        metrics.cancelled_orders ?? existing.cancelled_orders,
        metrics.cancelled_revenue ?? existing.cancelled_revenue,
        metrics.shop,
        metrics.date
      ).run();
    } else {
      // Insert new record
      await this.db.prepare(`
        INSERT INTO daily_metrics (
          shop, date, total_revenue, total_orders, average_order_value,
          new_customer_orders, returning_customer_orders, total_items_sold,
          total_discounts, orders_with_discount, total_refunds, refund_count,
          cancelled_orders, cancelled_revenue
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        metrics.shop,
        metrics.date,
        metrics.total_revenue ?? 0,
        metrics.total_orders ?? 0,
        metrics.average_order_value ?? 0,
        metrics.new_customer_orders ?? 0,
        metrics.returning_customer_orders ?? 0,
        metrics.total_items_sold ?? 0,
        metrics.total_discounts ?? 0,
        metrics.orders_with_discount ?? 0,
        metrics.total_refunds ?? 0,
        metrics.refund_count ?? 0,
        metrics.cancelled_orders ?? 0,
        metrics.cancelled_revenue ?? 0
      ).run();
    }
  }

  /**
   * Increment daily metrics (for webhook handlers)
   */
  async incrementDailyMetrics(
    shop: string, 
    date: string, 
    increments: {
      revenue?: number;
      orders?: number;
      newCustomerOrders?: number;
      returningCustomerOrders?: number;
      itemsSold?: number;
      discounts?: number;
      ordersWithDiscount?: number;
      refunds?: number;
      refundCount?: number;
      cancelledOrders?: number;
      cancelledRevenue?: number;
    }
  ): Promise<void> {
    // First ensure the record exists
    const existing = await this.getDailyMetrics(shop, date);
    
    if (!existing) {
      await this.upsertDailyMetrics({ shop, date });
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (increments.revenue !== undefined) {
      updates.push('total_revenue = total_revenue + ?');
      values.push(increments.revenue);
    }
    if (increments.orders !== undefined) {
      updates.push('total_orders = total_orders + ?');
      values.push(increments.orders);
    }
    if (increments.newCustomerOrders !== undefined) {
      updates.push('new_customer_orders = new_customer_orders + ?');
      values.push(increments.newCustomerOrders);
    }
    if (increments.returningCustomerOrders !== undefined) {
      updates.push('returning_customer_orders = returning_customer_orders + ?');
      values.push(increments.returningCustomerOrders);
    }
    if (increments.itemsSold !== undefined) {
      updates.push('total_items_sold = total_items_sold + ?');
      values.push(increments.itemsSold);
    }
    if (increments.discounts !== undefined) {
      updates.push('total_discounts = total_discounts + ?');
      values.push(increments.discounts);
    }
    if (increments.ordersWithDiscount !== undefined) {
      updates.push('orders_with_discount = orders_with_discount + ?');
      values.push(increments.ordersWithDiscount);
    }
    if (increments.refunds !== undefined) {
      updates.push('total_refunds = total_refunds + ?');
      values.push(increments.refunds);
    }
    if (increments.refundCount !== undefined) {
      updates.push('refund_count = refund_count + ?');
      values.push(increments.refundCount);
    }
    if (increments.cancelledOrders !== undefined) {
      updates.push('cancelled_orders = cancelled_orders + ?');
      values.push(increments.cancelledOrders);
    }
    if (increments.cancelledRevenue !== undefined) {
      updates.push('cancelled_revenue = cancelled_revenue + ?');
      values.push(increments.cancelledRevenue);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(shop, date);
      
      await this.db.prepare(`
        UPDATE daily_metrics SET ${updates.join(', ')} WHERE shop = ? AND date = ?
      `).bind(...values).run();

      // Recalculate AOV
      await this.recalculateAOV(shop, date);
    }
  }

  /**
   * Recalculate average order value
   */
  private async recalculateAOV(shop: string, date: string): Promise<void> {
    await this.db.prepare(`
      UPDATE daily_metrics 
      SET average_order_value = CASE 
        WHEN total_orders > 0 THEN total_revenue / total_orders 
        ELSE 0 
      END
      WHERE shop = ? AND date = ?
    `).bind(shop, date).run();
  }

  // ============ Product Metrics CRUD ============

  /**
   * Get product metrics for a date range
   */
  async getProductMetricsRange(shop: string, startDate: string, endDate: string): Promise<DailyProductMetrics[]> {
    const result = await this.db.prepare(
      'SELECT * FROM daily_product_metrics WHERE shop = ? AND date >= ? AND date <= ? ORDER BY date ASC'
    ).bind(shop, startDate, endDate).all<DailyProductMetrics>();
    return result.results || [];
  }

  /**
   * Get aggregated product metrics for a period
   */
  async getAggregatedProductMetrics(shop: string, startDate: string, endDate: string): Promise<ProductPeriodMetrics[]> {
    const result = await this.db.prepare(`
      SELECT 
        product_id as productId,
        product_title as productTitle,
        SUM(revenue) as revenue,
        SUM(units_sold) as unitsSold
      FROM daily_product_metrics 
      WHERE shop = ? AND date >= ? AND date <= ?
      GROUP BY product_id, product_title
      ORDER BY revenue DESC
    `).bind(shop, startDate, endDate).all<ProductPeriodMetrics>();
    return result.results || [];
  }

  /**
   * Increment product metrics
   */
  async incrementProductMetrics(
    shop: string,
    date: string,
    productId: string,
    productTitle: string,
    variantId: string,
    variantTitle: string,
    increments: { unitsSold?: number; revenue?: number; discountAmount?: number }
  ): Promise<void> {
    // Check if exists
    const existing = await this.db.prepare(
      'SELECT * FROM daily_product_metrics WHERE shop = ? AND date = ? AND product_id = ? AND variant_id = ?'
    ).bind(shop, date, productId, variantId).first();

    if (existing) {
      await this.db.prepare(`
        UPDATE daily_product_metrics SET
          units_sold = units_sold + ?,
          revenue = revenue + ?,
          discount_amount = discount_amount + ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE shop = ? AND date = ? AND product_id = ? AND variant_id = ?
      `).bind(
        increments.unitsSold ?? 0,
        increments.revenue ?? 0,
        increments.discountAmount ?? 0,
        shop, date, productId, variantId
      ).run();
    } else {
      await this.db.prepare(`
        INSERT INTO daily_product_metrics (
          shop, date, product_id, product_title, variant_id, variant_title,
          units_sold, revenue, discount_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        shop, date, productId, productTitle, variantId, variantTitle,
        increments.unitsSold ?? 0,
        increments.revenue ?? 0,
        increments.discountAmount ?? 0
      ).run();
    }
  }

  // ============ Customer Metrics CRUD ============

  /**
   * Get customer metrics for a date range
   */
  async getCustomerMetricsRange(shop: string, startDate: string, endDate: string): Promise<DailyCustomerMetrics[]> {
    const result = await this.db.prepare(
      'SELECT * FROM daily_customer_metrics WHERE shop = ? AND date >= ? AND date <= ? ORDER BY date ASC'
    ).bind(shop, startDate, endDate).all<DailyCustomerMetrics>();
    return result.results || [];
  }

  /**
   * Increment customer metrics
   */
  async incrementCustomerMetrics(
    shop: string,
    date: string,
    increments: { newCustomers?: number; returningCustomers?: number }
  ): Promise<void> {
    const existing = await this.db.prepare(
      'SELECT * FROM daily_customer_metrics WHERE shop = ? AND date = ?'
    ).bind(shop, date).first();

    if (existing) {
      await this.db.prepare(`
        UPDATE daily_customer_metrics SET
          new_customers = new_customers + ?,
          returning_customers = returning_customers + ?,
          total_customers = total_customers + ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE shop = ? AND date = ?
      `).bind(
        increments.newCustomers ?? 0,
        increments.returningCustomers ?? 0,
        (increments.newCustomers ?? 0) + (increments.returningCustomers ?? 0),
        shop, date
      ).run();
    } else {
      await this.db.prepare(`
        INSERT INTO daily_customer_metrics (shop, date, new_customers, returning_customers, total_customers)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        shop, date,
        increments.newCustomers ?? 0,
        increments.returningCustomers ?? 0,
        (increments.newCustomers ?? 0) + (increments.returningCustomers ?? 0)
      ).run();
    }
  }

  // ============ Shop Events CRUD ============

  /**
   * Log a shop event
   */
  async logEvent(event: Omit<ShopEvent, 'id' | 'created_at'>): Promise<void> {
    await this.db.prepare(`
      INSERT INTO shop_events (shop, date, event_type, description, impact_amount, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      event.shop,
      event.date,
      event.event_type,
      event.description,
      event.impact_amount ?? null,
      event.metadata ?? null
    ).run();
  }

  /**
   * Get events for a date range
   */
  async getEventsRange(shop: string, startDate: string, endDate: string): Promise<ShopEvent[]> {
    const result = await this.db.prepare(
      'SELECT * FROM shop_events WHERE shop = ? AND date >= ? AND date <= ? ORDER BY date DESC'
    ).bind(shop, startDate, endDate).all<ShopEvent>();
    return result.results || [];
  }

  // ============ Webhook Deduplication ============

  /**
   * Check if webhook has been processed
   */
  async isWebhookProcessed(shop: string, webhookId: string): Promise<boolean> {
    const result = await this.db.prepare(
      'SELECT 1 FROM processed_webhooks WHERE shop = ? AND webhook_id = ?'
    ).bind(shop, webhookId).first();
    return result !== null;
  }

  /**
   * Mark webhook as processed
   */
  async markWebhookProcessed(shop: string, webhookId: string, topic: string): Promise<void> {
    await this.db.prepare(
      'INSERT OR IGNORE INTO processed_webhooks (shop, webhook_id, topic) VALUES (?, ?, ?)'
    ).bind(shop, webhookId, topic).run();
  }

  // ============ Order Breakdown CRUD ============

  /**
   * Increment order breakdown metrics
   */
  async incrementOrderBreakdown(
    shop: string,
    date: string,
    breakdownType: OrderBreakdownType,
    breakdownValue: string,
    increments: { orderCount?: number; revenue?: number }
  ): Promise<void> {
    const existing = await this.db.prepare(
      'SELECT * FROM daily_order_breakdown WHERE shop = ? AND date = ? AND breakdown_type = ? AND breakdown_value = ?'
    ).bind(shop, date, breakdownType, breakdownValue).first();

    if (existing) {
      await this.db.prepare(`
        UPDATE daily_order_breakdown SET
          order_count = order_count + ?,
          revenue = revenue + ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE shop = ? AND date = ? AND breakdown_type = ? AND breakdown_value = ?
      `).bind(
        increments.orderCount ?? 0,
        increments.revenue ?? 0,
        shop, date, breakdownType, breakdownValue
      ).run();
    } else {
      await this.db.prepare(`
        INSERT INTO daily_order_breakdown (shop, date, breakdown_type, breakdown_value, order_count, revenue)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        shop, date, breakdownType, breakdownValue,
        increments.orderCount ?? 0,
        increments.revenue ?? 0
      ).run();
    }
  }

  /**
   * Get aggregated order breakdown for a date range and type
   */
  async getAggregatedOrderBreakdown(
    shop: string,
    startDate: string,
    endDate: string,
    breakdownType: OrderBreakdownType
  ): Promise<AggregatedOrderBreakdown[]> {
    const result = await this.db.prepare(`
      SELECT 
        breakdown_value,
        SUM(order_count) as order_count,
        SUM(revenue) as revenue
      FROM daily_order_breakdown 
      WHERE shop = ? AND date >= ? AND date <= ? AND breakdown_type = ?
      GROUP BY breakdown_value
      ORDER BY order_count DESC
    `).bind(shop, startDate, endDate, breakdownType).all<AggregatedOrderBreakdown>();
    return result.results || [];
  }

  // ============ Aggregation Helpers ============

  /**
   * Aggregate daily metrics into period metrics
   * Note: revenue is calculated as NET revenue (total_revenue - cancelled_revenue - total_refunds)
   */
  aggregateToPeriodMetrics(dailyMetrics: DailyMetrics[]): PeriodMetrics {
    const aggregated = dailyMetrics.reduce((acc, day) => ({
      grossRevenue: acc.grossRevenue + day.total_revenue,
      orders: acc.orders + day.total_orders,
      aov: 0, // Calculate after
      newCustomerOrders: acc.newCustomerOrders + day.new_customer_orders,
      returningCustomerOrders: acc.returningCustomerOrders + day.returning_customer_orders,
      itemsSold: acc.itemsSold + day.total_items_sold,
      discountTotal: acc.discountTotal + day.total_discounts,
      ordersWithDiscount: acc.ordersWithDiscount + day.orders_with_discount,
      refundTotal: acc.refundTotal + day.total_refunds,
      refundCount: acc.refundCount + day.refund_count,
      cancelledOrders: acc.cancelledOrders + day.cancelled_orders,
      cancelledRevenue: acc.cancelledRevenue + day.cancelled_revenue,
    }), {
      grossRevenue: 0,
      orders: 0,
      aov: 0,
      newCustomerOrders: 0,
      returningCustomerOrders: 0,
      itemsSold: 0,
      discountTotal: 0,
      ordersWithDiscount: 0,
      refundTotal: 0,
      refundCount: 0,
      cancelledOrders: 0,
      cancelledRevenue: 0,
    });

    // Calculate NET revenue: gross - cancelled - refunds
    const netRevenue = aggregated.grossRevenue - aggregated.cancelledRevenue - aggregated.refundTotal;

    return {
      revenue: netRevenue, // This is now NET revenue
      grossRevenue: aggregated.grossRevenue,
      orders: aggregated.orders,
      aov: 0,
      newCustomerOrders: aggregated.newCustomerOrders,
      returningCustomerOrders: aggregated.returningCustomerOrders,
      itemsSold: aggregated.itemsSold,
      discountTotal: aggregated.discountTotal,
      ordersWithDiscount: aggregated.ordersWithDiscount,
      refundTotal: aggregated.refundTotal,
      refundCount: aggregated.refundCount,
      cancelledOrders: aggregated.cancelledOrders,
      cancelledRevenue: aggregated.cancelledRevenue,
    } as PeriodMetrics;
  }

  /**
   * Calculate AOV for period metrics
   */
  calculateAOV(metrics: PeriodMetrics): PeriodMetrics {
    return {
      ...metrics,
      aov: metrics.orders > 0 ? metrics.revenue / metrics.orders : 0
    };
  }
}

