import { 
  Env, 
  DailyMetrics, 
  DailyProductMetrics, 
  DailyCustomerMetrics,
  HourlyOrderMetrics,
  CustomerLifetime,
  RefundDetails,
  CancellationDetails,
  ShopEvent,
  PeriodMetrics,
  ProductPeriodMetrics,
  CustomerValueMetrics,
  OrderBreakdownType,
  DailyOrderBreakdown,
  AggregatedOrderBreakdown,
  CustomerGeography
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
          paid_orders = ?,
          pending_orders = ?,
          refunded_orders = ?,
          partially_refunded_orders = ?,
          fulfilled_orders = ?,
          unfulfilled_orders = ?,
          partially_fulfilled_orders = ?,
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
        metrics.paid_orders ?? existing.paid_orders ?? 0,
        metrics.pending_orders ?? existing.pending_orders ?? 0,
        metrics.refunded_orders ?? existing.refunded_orders ?? 0,
        metrics.partially_refunded_orders ?? existing.partially_refunded_orders ?? 0,
        metrics.fulfilled_orders ?? existing.fulfilled_orders ?? 0,
        metrics.unfulfilled_orders ?? existing.unfulfilled_orders ?? 0,
        metrics.partially_fulfilled_orders ?? existing.partially_fulfilled_orders ?? 0,
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
          cancelled_orders, cancelled_revenue, paid_orders, pending_orders,
          refunded_orders, partially_refunded_orders, fulfilled_orders,
          unfulfilled_orders, partially_fulfilled_orders
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        metrics.cancelled_revenue ?? 0,
        metrics.paid_orders ?? 0,
        metrics.pending_orders ?? 0,
        metrics.refunded_orders ?? 0,
        metrics.partially_refunded_orders ?? 0,
        metrics.fulfilled_orders ?? 0,
        metrics.unfulfilled_orders ?? 0,
        metrics.partially_fulfilled_orders ?? 0
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
      paidOrders?: number;
      pendingOrders?: number;
      refundedOrders?: number;
      partiallyRefundedOrders?: number;
      fulfilledOrders?: number;
      unfulfilledOrders?: number;
      partiallyFulfilledOrders?: number;
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
    if (increments.paidOrders !== undefined) {
      updates.push('paid_orders = paid_orders + ?');
      values.push(increments.paidOrders);
    }
    if (increments.pendingOrders !== undefined) {
      updates.push('pending_orders = pending_orders + ?');
      values.push(increments.pendingOrders);
    }
    if (increments.refundedOrders !== undefined) {
      updates.push('refunded_orders = refunded_orders + ?');
      values.push(increments.refundedOrders);
    }
    if (increments.partiallyRefundedOrders !== undefined) {
      updates.push('partially_refunded_orders = partially_refunded_orders + ?');
      values.push(increments.partiallyRefundedOrders);
    }
    if (increments.fulfilledOrders !== undefined) {
      updates.push('fulfilled_orders = fulfilled_orders + ?');
      values.push(increments.fulfilledOrders);
    }
    if (increments.unfulfilledOrders !== undefined) {
      updates.push('unfulfilled_orders = unfulfilled_orders + ?');
      values.push(increments.unfulfilledOrders);
    }
    if (increments.partiallyFulfilledOrders !== undefined) {
      updates.push('partially_fulfilled_orders = partially_fulfilled_orders + ?');
      values.push(increments.partiallyFulfilledOrders);
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

  // ============ Hourly Metrics CRUD ============

  /**
   * Get hourly metrics for a date range
   */
  async getHourlyMetricsRange(shop: string, startDate: string, endDate: string): Promise<HourlyOrderMetrics[]> {
    const result = await this.db.prepare(
      'SELECT * FROM hourly_order_metrics WHERE shop = ? AND date >= ? AND date <= ? ORDER BY date ASC, hour ASC'
    ).bind(shop, startDate, endDate).all<HourlyOrderMetrics>();
    return result.results || [];
  }

  /**
   * Get aggregated hourly metrics across all dates
   */
  async getAggregatedHourlyMetrics(shop: string, startDate: string, endDate: string): Promise<{ hour: number; order_count: number; revenue: number; items_sold: number }[]> {
    const result = await this.db.prepare(`
      SELECT 
        hour,
        SUM(order_count) as order_count,
        SUM(revenue) as revenue,
        SUM(items_sold) as items_sold
      FROM hourly_order_metrics 
      WHERE shop = ? AND date >= ? AND date <= ?
      GROUP BY hour
      ORDER BY hour ASC
    `).bind(shop, startDate, endDate).all();
    return result.results as any[] || [];
  }

  /**
   * Increment hourly metrics
   */
  async incrementHourlyMetrics(
    shop: string,
    date: string,
    hour: number,
    increments: { orderCount?: number; revenue?: number; itemsSold?: number }
  ): Promise<void> {
    const existing = await this.db.prepare(
      'SELECT * FROM hourly_order_metrics WHERE shop = ? AND date = ? AND hour = ?'
    ).bind(shop, date, hour).first();

    if (existing) {
      await this.db.prepare(`
        UPDATE hourly_order_metrics SET
          order_count = order_count + ?,
          revenue = revenue + ?,
          items_sold = items_sold + ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE shop = ? AND date = ? AND hour = ?
      `).bind(
        increments.orderCount ?? 0,
        increments.revenue ?? 0,
        increments.itemsSold ?? 0,
        shop, date, hour
      ).run();
    } else {
      await this.db.prepare(`
        INSERT INTO hourly_order_metrics (shop, date, hour, order_count, revenue, items_sold)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        shop, date, hour,
        increments.orderCount ?? 0,
        increments.revenue ?? 0,
        increments.itemsSold ?? 0
      ).run();
    }
  }

  // ============ Customer Lifetime CRUD ============

  /**
   * Get customer lifetime data
   */
  async getCustomerLifetime(shop: string, customerId: string): Promise<CustomerLifetime | null> {
    const result = await this.db.prepare(
      'SELECT * FROM customer_lifetime WHERE shop = ? AND customer_id = ?'
    ).bind(shop, customerId).first<CustomerLifetime>();
    return result;
  }

  /**
   * Get all customer lifetime data for a shop
   */
  async getAllCustomerLifetime(shop: string, limit: number = 100, orderBy: 'total_spent' | 'total_orders' = 'total_spent'): Promise<CustomerLifetime[]> {
    const result = await this.db.prepare(
      `SELECT * FROM customer_lifetime WHERE shop = ? ORDER BY ${orderBy} DESC LIMIT ?`
    ).bind(shop, limit).all<CustomerLifetime>();
    return result.results || [];
  }

  /**
   * Get customer value statistics
   */
  async getCustomerValueStats(shop: string): Promise<{
    totalCustomers: number;
    repeatCustomers: number;
    oneTimeCustomers: number;
    avgLifetimeValue: number;
    totalRevenue: number;
    avgOrdersPerCustomer: number;
  }> {
    const result = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_customers,
        SUM(CASE WHEN is_repeat_customer = 1 THEN 1 ELSE 0 END) as repeat_customers,
        SUM(CASE WHEN is_repeat_customer = 0 THEN 1 ELSE 0 END) as one_time_customers,
        AVG(total_spent) as avg_lifetime_value,
        SUM(total_spent) as total_revenue,
        AVG(total_orders) as avg_orders_per_customer
      FROM customer_lifetime WHERE shop = ?
    `).bind(shop).first<any>();
    
    return {
      totalCustomers: result?.total_customers || 0,
      repeatCustomers: result?.repeat_customers || 0,
      oneTimeCustomers: result?.one_time_customers || 0,
      avgLifetimeValue: result?.avg_lifetime_value || 0,
      totalRevenue: result?.total_revenue || 0,
      avgOrdersPerCustomer: result?.avg_orders_per_customer || 0,
    };
  }

  /**
   * Upsert customer lifetime data
   */
  async upsertCustomerLifetime(
    shop: string,
    customerId: string,
    data: {
      email?: string;
      orderDate: string;
      orderAmount: number;
      refundAmount?: number;
    }
  ): Promise<void> {
    const existing = await this.getCustomerLifetime(shop, customerId);

    if (existing) {
      const newTotalOrders = existing.total_orders + 1;
      const newTotalSpent = existing.total_spent + data.orderAmount;
      const newTotalRefunded = existing.total_refunded + (data.refundAmount || 0);
      
      await this.db.prepare(`
        UPDATE customer_lifetime SET
          email = COALESCE(?, email),
          last_order_date = ?,
          total_orders = ?,
          total_spent = ?,
          total_refunded = ?,
          average_order_value = ?,
          is_repeat_customer = CASE WHEN ? > 1 THEN 1 ELSE 0 END,
          updated_at = CURRENT_TIMESTAMP
        WHERE shop = ? AND customer_id = ?
      `).bind(
        data.email,
        data.orderDate,
        newTotalOrders,
        newTotalSpent,
        newTotalRefunded,
        newTotalSpent / newTotalOrders,
        newTotalOrders,
        shop,
        customerId
      ).run();
    } else {
      await this.db.prepare(`
        INSERT INTO customer_lifetime (
          shop, customer_id, email, first_order_date, last_order_date,
          total_orders, total_spent, total_refunded, average_order_value, is_repeat_customer
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        shop,
        customerId,
        data.email || null,
        data.orderDate,
        data.orderDate,
        1,
        data.orderAmount,
        data.refundAmount || 0,
        data.orderAmount,
        0 // First order, not repeat yet
      ).run();
    }
  }

  /**
   * Add refund to customer lifetime
   */
  async addCustomerRefund(shop: string, customerId: string, refundAmount: number): Promise<void> {
    await this.db.prepare(`
      UPDATE customer_lifetime SET
        total_refunded = total_refunded + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE shop = ? AND customer_id = ?
    `).bind(refundAmount, shop, customerId).run();
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
        SUM(units_sold) as unitsSold,
        SUM(units_refunded) as unitsRefunded,
        SUM(refund_amount) as refundAmount
      FROM daily_product_metrics 
      WHERE shop = ? AND date >= ? AND date <= ?
      GROUP BY product_id, product_title
      ORDER BY revenue DESC
    `).bind(shop, startDate, endDate).all<ProductPeriodMetrics>();
    
    return (result.results || []).map(p => ({
      ...p,
      netRevenue: p.revenue - (p.refundAmount || 0),
      refundRate: p.unitsSold > 0 ? ((p.unitsRefunded || 0) / p.unitsSold) * 100 : 0,
    }));
  }

  /**
   * Get product performance trends (daily data for each product)
   */
  async getProductTrends(shop: string, productId: string, startDate: string, endDate: string): Promise<DailyProductMetrics[]> {
    const result = await this.db.prepare(`
      SELECT * FROM daily_product_metrics 
      WHERE shop = ? AND product_id = ? AND date >= ? AND date <= ?
      ORDER BY date ASC
    `).bind(shop, productId, startDate, endDate).all<DailyProductMetrics>();
    return result.results || [];
  }

  /**
   * Get products with high refund rates
   */
  async getHighRefundProducts(shop: string, startDate: string, endDate: string, minRefundRate: number = 10): Promise<ProductPeriodMetrics[]> {
    const products = await this.getAggregatedProductMetrics(shop, startDate, endDate);
    return products.filter(p => (p.refundRate || 0) >= minRefundRate);
  }

  /**
   * Get all products ever sold (for lifecycle analysis)
   */
  async getAllProductsEverSold(shop: string): Promise<{ productId: string; productTitle: string; lastSaleDate: string; totalUnitsSold: number }[]> {
    const result = await this.db.prepare(`
      SELECT 
        product_id as productId,
        product_title as productTitle,
        MAX(date) as lastSaleDate,
        SUM(units_sold) as totalUnitsSold
      FROM daily_product_metrics 
      WHERE shop = ?
      GROUP BY product_id, product_title
      ORDER BY lastSaleDate DESC
    `).bind(shop).all();
    return result.results as any[] || [];
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
    increments: { unitsSold?: number; revenue?: number; discountAmount?: number; unitsRefunded?: number; refundAmount?: number }
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
          units_refunded = units_refunded + ?,
          refund_amount = refund_amount + ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE shop = ? AND date = ? AND product_id = ? AND variant_id = ?
      `).bind(
        increments.unitsSold ?? 0,
        increments.revenue ?? 0,
        increments.discountAmount ?? 0,
        increments.unitsRefunded ?? 0,
        increments.refundAmount ?? 0,
        shop, date, productId, variantId
      ).run();
    } else {
      await this.db.prepare(`
        INSERT INTO daily_product_metrics (
          shop, date, product_id, product_title, variant_id, variant_title,
          units_sold, revenue, discount_amount, units_refunded, refund_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        shop, date, productId, productTitle, variantId, variantTitle,
        increments.unitsSold ?? 0,
        increments.revenue ?? 0,
        increments.discountAmount ?? 0,
        increments.unitsRefunded ?? 0,
        increments.refundAmount ?? 0
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
   * Get aggregated customer growth metrics
   */
  async getCustomerGrowthMetrics(shop: string, startDate: string, endDate: string): Promise<{
    totalNew: number;
    totalReturning: number;
    dailyBreakdown: { date: string; new_customers: number; returning_customers: number }[];
  }> {
    const daily = await this.getCustomerMetricsRange(shop, startDate, endDate);
    
    const totalNew = daily.reduce((sum, d) => sum + d.new_customers, 0);
    const totalReturning = daily.reduce((sum, d) => sum + d.returning_customers, 0);
    
    return {
      totalNew,
      totalReturning,
      dailyBreakdown: daily.map(d => ({
        date: d.date,
        new_customers: d.new_customers,
        returning_customers: d.returning_customers,
      })),
    };
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

  // ============ Refund Details CRUD ============

  /**
   * Record refund details
   */
  async recordRefundDetails(refund: Omit<RefundDetails, 'id' | 'created_at'>): Promise<void> {
    await this.db.prepare(`
      INSERT OR REPLACE INTO refund_details (shop, date, refund_id, order_id, amount, reason, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      refund.shop,
      refund.date,
      refund.refund_id,
      refund.order_id,
      refund.amount,
      refund.reason || null,
      refund.note || null
    ).run();
  }

  /**
   * Get refunds by reason
   */
  async getRefundsByReason(shop: string, startDate: string, endDate: string): Promise<{ reason: string; count: number; amount: number }[]> {
    const result = await this.db.prepare(`
      SELECT 
        COALESCE(reason, 'unspecified') as reason,
        COUNT(*) as count,
        SUM(amount) as amount
      FROM refund_details 
      WHERE shop = ? AND date >= ? AND date <= ?
      GROUP BY reason
      ORDER BY amount DESC
    `).bind(shop, startDate, endDate).all();
    return result.results as any[] || [];
  }

  // ============ Cancellation Details CRUD ============

  /**
   * Record cancellation details
   */
  async recordCancellationDetails(cancellation: Omit<CancellationDetails, 'id' | 'created_at'>): Promise<void> {
    await this.db.prepare(`
      INSERT OR REPLACE INTO cancellation_details (shop, date, cancellation_date, order_id, amount, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      cancellation.shop,
      cancellation.date,
      cancellation.cancellation_date,
      cancellation.order_id,
      cancellation.amount,
      cancellation.reason || null
    ).run();
  }

  /**
   * Get cancellations by reason
   */
  async getCancellationsByReason(shop: string, startDate: string, endDate: string): Promise<{ reason: string; count: number; amount: number }[]> {
    const result = await this.db.prepare(`
      SELECT 
        COALESCE(reason, 'unspecified') as reason,
        COUNT(*) as count,
        SUM(amount) as amount
      FROM cancellation_details 
      WHERE shop = ? AND date >= ? AND date <= ?
      GROUP BY reason
      ORDER BY amount DESC
    `).bind(shop, startDate, endDate).all();
    return result.results as any[] || [];
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

  // ============ Customer Geography CRUD ============

  /**
   * Upsert customer geography data
   */
  async upsertCustomerGeography(
    shop: string,
    country: string,
    countryCode: string | null,
    increments: { customerCount?: number; totalSpent?: number; totalOrders?: number }
  ): Promise<void> {
    const existing = await this.db.prepare(
      'SELECT * FROM customer_geography WHERE shop = ? AND country = ?'
    ).bind(shop, country).first();

    if (existing) {
      await this.db.prepare(`
        UPDATE customer_geography SET
          customer_count = customer_count + ?,
          total_spent = total_spent + ?,
          total_orders = total_orders + ?,
          country_code = COALESCE(?, country_code),
          updated_at = CURRENT_TIMESTAMP
        WHERE shop = ? AND country = ?
      `).bind(
        increments.customerCount ?? 0,
        increments.totalSpent ?? 0,
        increments.totalOrders ?? 0,
        countryCode,
        shop, country
      ).run();
    } else {
      await this.db.prepare(`
        INSERT INTO customer_geography (shop, country, country_code, customer_count, total_spent, total_orders)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        shop, country, countryCode,
        increments.customerCount ?? 0,
        increments.totalSpent ?? 0,
        increments.totalOrders ?? 0
      ).run();
    }
  }

  /**
   * Set customer geography data (for reconciliation - replaces existing)
   */
  async setCustomerGeography(
    shop: string,
    country: string,
    countryCode: string | null,
    data: { customerCount: number; totalSpent: number; totalOrders: number }
  ): Promise<void> {
    await this.db.prepare(`
      INSERT OR REPLACE INTO customer_geography (shop, country, country_code, customer_count, total_spent, total_orders)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      shop, country, countryCode,
      data.customerCount,
      data.totalSpent,
      data.totalOrders
    ).run();
  }

  /**
   * Get all customer geography data for a shop
   */
  async getCustomerGeography(shop: string): Promise<CustomerGeography[]> {
    const result = await this.db.prepare(
      'SELECT * FROM customer_geography WHERE shop = ? ORDER BY customer_count DESC'
    ).bind(shop).all<CustomerGeography>();
    return result.results || [];
  }

  /**
   * Clear customer geography for a shop (for reconciliation)
   */
  async clearCustomerGeography(shop: string): Promise<void> {
    await this.db.prepare('DELETE FROM customer_geography WHERE shop = ?').bind(shop).run();
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
      paidOrders: acc.paidOrders + (day.paid_orders || 0),
      pendingOrders: acc.pendingOrders + (day.pending_orders || 0),
      refundedOrders: acc.refundedOrders + (day.refunded_orders || 0),
      partiallyRefundedOrders: acc.partiallyRefundedOrders + (day.partially_refunded_orders || 0),
      fulfilledOrders: acc.fulfilledOrders + (day.fulfilled_orders || 0),
      unfulfilledOrders: acc.unfulfilledOrders + (day.unfulfilled_orders || 0),
      partiallyFulfilledOrders: acc.partiallyFulfilledOrders + (day.partially_fulfilled_orders || 0),
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
      paidOrders: 0,
      pendingOrders: 0,
      refundedOrders: 0,
      partiallyRefundedOrders: 0,
      fulfilledOrders: 0,
      unfulfilledOrders: 0,
      partiallyFulfilledOrders: 0,
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
      paidOrders: aggregated.paidOrders,
      pendingOrders: aggregated.pendingOrders,
      refundedOrders: aggregated.refundedOrders,
      partiallyRefundedOrders: aggregated.partiallyRefundedOrders,
      fulfilledOrders: aggregated.fulfilledOrders,
      unfulfilledOrders: aggregated.unfulfilledOrders,
      partiallyFulfilledOrders: aggregated.partiallyFulfilledOrders,
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
