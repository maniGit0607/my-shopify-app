import { Hono } from 'hono';
import { Env, AnalyticsReport, PeriodMetrics, OrderBreakdownType } from '../types';
import { validateSessionToken, getShop } from '../middleware/session-token';
import { MetricsService } from '../services/metrics-service';
import { AnalyticsEngine } from '../services/analytics-engine';

const insights = new Hono<{ Bindings: Env }>();

// Apply session token validation middleware to all insights routes
insights.use('/*', validateSessionToken);

/**
 * Helper to get date range for different periods
 */
function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  
  switch (period) {
    case 'today':
      return { start: end, end };
    
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      return { start: yesterdayStr, end: yesterdayStr };
    }
    
    case 'last7days': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { start: start.toISOString().split('T')[0], end };
    }
    
    case 'last30days': {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { start: start.toISOString().split('T')[0], end };
    }
    
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: start.toISOString().split('T')[0], end };
    }
    
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { 
        start: start.toISOString().split('T')[0], 
        end: end.toISOString().split('T')[0] 
      };
    }
    
    case 'thisQuarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      return { start: start.toISOString().split('T')[0], end };
    }
    
    case 'thisYear': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: start.toISOString().split('T')[0], end };
    }

    case 'lastYear': {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return { 
        start: start.toISOString().split('T')[0], 
        end: end.toISOString().split('T')[0] 
      };
    }
    
    default:
      // Default to last 30 days
      const defaultStart = new Date(now);
      defaultStart.setDate(defaultStart.getDate() - 30);
      return { start: defaultStart.toISOString().split('T')[0], end };
  }
}

/**
 * Get comparison period (previous period of same length)
 */
function getComparisonRange(start: string, end: string): { start: string; end: string } {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const compEnd = new Date(startDate);
  compEnd.setDate(compEnd.getDate() - 1);
  
  const compStart = new Date(compEnd);
  compStart.setDate(compStart.getDate() - daysDiff + 1);
  
  return {
    start: compStart.toISOString().split('T')[0],
    end: compEnd.toISOString().split('T')[0]
  };
}

/**
 * Get date range for week/month/year comparisons
 */
function getComparisonPeriod(start: string, end: string, type: 'week' | 'month' | 'year'): { start: string; end: string } {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  switch (type) {
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      endDate.setDate(endDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      endDate.setMonth(endDate.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      endDate.setFullYear(endDate.getFullYear() - 1);
      break;
  }
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
}

/**
 * Get day of week name
 */
function getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

// ============ ORDER REPORTS ============

/**
 * GET /insights/orders/sales-revenue
 * Sales & Revenue Report (Report #1)
 */
insights.get('/orders/sales-revenue', async (c) => {
  const shop = getShop(c);
  if (!shop) return c.json({ error: 'Shop not found' }, 401);

  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const period = c.req.query('period') || 'last30days';

    const dateRange = startDate && endDate 
      ? { start: startDate, end: endDate }
      : getDateRange(period);

    const metricsService = new MetricsService(c.env);
    
    // Get current period metrics
    const dailyMetrics = await metricsService.getDailyMetricsRange(shop, dateRange.start, dateRange.end);
    const currentMetrics = metricsService.calculateAOV(metricsService.aggregateToPeriodMetrics(dailyMetrics));

    // Get comparison periods for growth calculations
    const weekAgo = getComparisonPeriod(dateRange.start, dateRange.end, 'week');
    const monthAgo = getComparisonPeriod(dateRange.start, dateRange.end, 'month');
    const yearAgo = getComparisonPeriod(dateRange.start, dateRange.end, 'year');

    const weekMetrics = metricsService.aggregateToPeriodMetrics(
      await metricsService.getDailyMetricsRange(shop, weekAgo.start, weekAgo.end)
    );
    const monthMetrics = metricsService.aggregateToPeriodMetrics(
      await metricsService.getDailyMetricsRange(shop, monthAgo.start, monthAgo.end)
    );
    const yearMetrics = metricsService.aggregateToPeriodMetrics(
      await metricsService.getDailyMetricsRange(shop, yearAgo.start, yearAgo.end)
    );

    // Calculate growth percentages
    const calcGrowth = (current: number, previous: number) => 
      previous > 0 ? ((current - previous) / previous) * 100 : 0;

    // Daily breakdown for charts
    const dailyBreakdown = dailyMetrics.map(d => ({
      date: d.date,
      dayOfWeek: getDayName(new Date(d.date)),
      grossSales: d.total_revenue,
      netSales: d.total_revenue - d.cancelled_revenue - d.total_refunds,
      orderCount: d.total_orders,
      avgOrderValue: d.average_order_value,
    }));

    return c.json({
      period: dateRange,
      grossSales: currentMetrics.grossRevenue,
      netSales: currentMetrics.revenue,
      totalRevenue: currentMetrics.revenue,
      averageOrderValue: currentMetrics.aov,
      ordersCount: currentMetrics.orders,
      itemsSold: currentMetrics.itemsSold,
      discountTotal: currentMetrics.discountTotal,
      revenueGrowth: {
        weekOverWeek: calcGrowth(currentMetrics.revenue, weekMetrics.revenue),
        monthOverMonth: calcGrowth(currentMetrics.revenue, monthMetrics.revenue),
        yearOverYear: calcGrowth(currentMetrics.revenue, yearMetrics.revenue),
      },
      ordersGrowth: {
        weekOverWeek: calcGrowth(currentMetrics.orders, weekMetrics.orders),
        monthOverMonth: calcGrowth(currentMetrics.orders, monthMetrics.orders),
        yearOverYear: calcGrowth(currentMetrics.orders, yearMetrics.orders),
      },
      dailyBreakdown,
    });

  } catch (error) {
    console.error('[Insights] Error generating sales report:', error);
    return c.json({ error: 'Failed to generate sales report' }, 500);
  }
});

/**
 * GET /insights/orders/refunds-cancellations
 * Refunds & Cancellations Report (Report #2)
 */
insights.get('/orders/refunds-cancellations', async (c) => {
  const shop = getShop(c);
  if (!shop) return c.json({ error: 'Shop not found' }, 401);

  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const period = c.req.query('period') || 'last30days';

    const dateRange = startDate && endDate 
      ? { start: startDate, end: endDate }
      : getDateRange(period);

    const metricsService = new MetricsService(c.env);
    
    const dailyMetrics = await metricsService.getDailyMetricsRange(shop, dateRange.start, dateRange.end);
    const currentMetrics = metricsService.aggregateToPeriodMetrics(dailyMetrics);

    // Get refund and cancellation reasons
    const refundsByReason = await metricsService.getRefundsByReason(shop, dateRange.start, dateRange.end);
    const cancellationsByReason = await metricsService.getCancellationsByReason(shop, dateRange.start, dateRange.end);

    // Calculate rates
    const totalOrders = currentMetrics.orders;
    const refundRate = totalOrders > 0 ? (currentMetrics.refundCount / totalOrders) * 100 : 0;
    const cancellationRate = totalOrders > 0 ? (currentMetrics.cancelledOrders / totalOrders) * 100 : 0;

    // Daily trend
    const dailyTrend = dailyMetrics.map(d => ({
      date: d.date,
      refundAmount: d.total_refunds,
      refundCount: d.refund_count,
      cancelledAmount: d.cancelled_revenue,
      cancelledCount: d.cancelled_orders,
    }));

    return c.json({
      period: dateRange,
      totalRefundedAmount: currentMetrics.refundTotal,
      refundRate,
      refundCount: currentMetrics.refundCount,
      cancelledOrdersCount: currentMetrics.cancelledOrders,
      cancelledRevenue: currentMetrics.cancelledRevenue,
      cancellationRate,
      refundsByReason,
      cancellationsByReason,
      dailyTrend,
    });

  } catch (error) {
    console.error('[Insights] Error generating refunds report:', error);
    return c.json({ error: 'Failed to generate refunds report' }, 500);
  }
});

/**
 * GET /insights/orders/status
 * Order Status Breakdown Report (Report #3)
 */
insights.get('/orders/status', async (c) => {
  const shop = getShop(c);
  if (!shop) return c.json({ error: 'Shop not found' }, 401);

  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const period = c.req.query('period') || 'last30days';

    const dateRange = startDate && endDate 
      ? { start: startDate, end: endDate }
      : getDateRange(period);

    const metricsService = new MetricsService(c.env);
    
    // Get breakdowns by all status types
    const financialBreakdown = await metricsService.getAggregatedOrderBreakdown(
      shop, dateRange.start, dateRange.end, 'financial_status'
    );
    const fulfillmentBreakdown = await metricsService.getAggregatedOrderBreakdown(
      shop, dateRange.start, dateRange.end, 'fulfillment_status'
    );
    const paymentMethodBreakdown = await metricsService.getAggregatedOrderBreakdown(
      shop, dateRange.start, dateRange.end, 'payment_method'
    );
    const channelBreakdown = await metricsService.getAggregatedOrderBreakdown(
      shop, dateRange.start, dateRange.end, 'channel'
    );

    // Get country breakdown from order shipping addresses
    const countryBreakdown = await metricsService.getAggregatedOrderBreakdown(
      shop, dateRange.start, dateRange.end, 'country'
    );

    // Format financial status
    const financialStatus: Record<string, { count: number; revenue: number }> = {};
    for (const item of financialBreakdown) {
      financialStatus[item.breakdown_value] = {
        count: item.order_count,
        revenue: item.revenue,
      };
    }

    // Format fulfillment status
    const fulfillmentStatus: Record<string, { count: number; revenue: number }> = {};
    for (const item of fulfillmentBreakdown) {
      fulfillmentStatus[item.breakdown_value] = {
        count: item.order_count,
        revenue: item.revenue,
      };
    }

    // Calculate totals
    const totalOrders = financialBreakdown.reduce((sum, item) => sum + item.order_count, 0);
    const totalRevenue = financialBreakdown.reduce((sum, item) => sum + item.revenue, 0);

    // Format payment method breakdown
    const paymentMethodData = paymentMethodBreakdown.map(item => ({
      name: formatStatusValue(item.breakdown_value),
      count: item.order_count,
      revenue: item.revenue,
      percentage: totalOrders > 0 ? (item.order_count / totalOrders) * 100 : 0,
    }));

    // Format channel breakdown
    const channelData = channelBreakdown.map(item => ({
      name: formatStatusValue(item.breakdown_value),
      count: item.order_count,
      revenue: item.revenue,
      percentage: totalOrders > 0 ? (item.order_count / totalOrders) * 100 : 0,
    }));

    // Format country breakdown from order shipping addresses
    const countryData = countryBreakdown.map(item => ({
      name: formatStatusValue(item.breakdown_value),
      count: item.order_count,
      revenue: item.revenue,
      percentage: totalOrders > 0 ? (item.order_count / totalOrders) * 100 : 0,
    }));

    return c.json({
      period: dateRange,
      totalOrders,
      totalRevenue,
      financialStatus: {
        paid: financialStatus['paid'] || { count: 0, revenue: 0 },
        pending: financialStatus['pending'] || { count: 0, revenue: 0 },
        authorized: financialStatus['authorized'] || { count: 0, revenue: 0 },
        refunded: financialStatus['refunded'] || { count: 0, revenue: 0 },
        partiallyRefunded: financialStatus['partially_refunded'] || { count: 0, revenue: 0 },
        voided: financialStatus['voided'] || { count: 0, revenue: 0 },
      },
      fulfillmentStatus: {
        fulfilled: fulfillmentStatus['fulfilled'] || { count: 0, revenue: 0 },
        unfulfilled: fulfillmentStatus['unfulfilled'] || { count: 0, revenue: 0 },
        partiallyFulfilled: fulfillmentStatus['partially_fulfilled'] || fulfillmentStatus['partial'] || { count: 0, revenue: 0 },
      },
      financialBreakdown: financialBreakdown.map(item => ({
        status: formatStatusValue(item.breakdown_value),
        count: item.order_count,
        revenue: item.revenue,
        percentage: totalOrders > 0 ? (item.order_count / totalOrders) * 100 : 0,
      })),
      fulfillmentBreakdown: fulfillmentBreakdown.map(item => ({
        status: formatStatusValue(item.breakdown_value),
        count: item.order_count,
        revenue: item.revenue,
        percentage: totalOrders > 0 ? (item.order_count / totalOrders) * 100 : 0,
      })),
      paymentMethodBreakdown: paymentMethodData,
      channelBreakdown: channelData,
      countryBreakdown: countryData,
    });

  } catch (error) {
    console.error('[Insights] Error generating status report:', error);
    return c.json({ error: 'Failed to generate status report' }, 500);
  }
});

/**
 * GET /insights/orders/trends
 * Time-based Order Trends Report (Report #4)
 */
insights.get('/orders/trends', async (c) => {
  const shop = getShop(c);
  if (!shop) return c.json({ error: 'Shop not found' }, 401);

  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const period = c.req.query('period') || 'last30days';

    const dateRange = startDate && endDate 
      ? { start: startDate, end: endDate }
      : getDateRange(period);

    const metricsService = new MetricsService(c.env);
    
    // Get daily and hourly metrics
    const dailyMetrics = await metricsService.getDailyMetricsRange(shop, dateRange.start, dateRange.end);
    const hourlyMetrics = await metricsService.getAggregatedHourlyMetrics(shop, dateRange.start, dateRange.end);

    // Daily trends with day of week
    const dailyTrends = dailyMetrics.map(d => {
      const date = new Date(d.date);
      return {
        date: d.date,
        dayOfWeek: getDayName(date),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        orderCount: d.total_orders,
        revenue: d.total_revenue - d.cancelled_revenue - d.total_refunds,
        avgOrderValue: d.average_order_value,
        itemsSold: d.total_items_sold,
      };
    });

    // Hourly heatmap data (0-23)
    const hourlyHeatmap = Array.from({ length: 24 }, (_, hour) => {
      const hourData = hourlyMetrics.find(h => h.hour === hour);
      return {
        hour,
        hourLabel: `${hour.toString().padStart(2, '0')}:00`,
        orderCount: hourData?.order_count || 0,
        revenue: hourData?.revenue || 0,
        avgItems: hourData?.order_count > 0 
          ? (hourData?.items_sold || 0) / hourData.order_count 
          : 0,
      };
    });

    // Calculate weekday vs weekend performance
    const weekdayData = dailyTrends.filter(d => !d.isWeekend);
    const weekendData = dailyTrends.filter(d => d.isWeekend);

    const avgMetrics = (data: typeof dailyTrends) => ({
      avgOrders: data.length > 0 ? data.reduce((sum, d) => sum + d.orderCount, 0) / data.length : 0,
      avgRevenue: data.length > 0 ? data.reduce((sum, d) => sum + d.revenue, 0) / data.length : 0,
      totalOrders: data.reduce((sum, d) => sum + d.orderCount, 0),
      totalRevenue: data.reduce((sum, d) => sum + d.revenue, 0),
    });

    // Find peak hour and day
    const peakHour = hourlyHeatmap.reduce((max, h) => 
      h.orderCount > max.orderCount ? h : max, hourlyHeatmap[0]);
    
    const peakDay = dailyTrends.reduce((max, d) => 
      d.orderCount > max.orderCount ? d : max, dailyTrends[0] || { date: '', dayOfWeek: 'N/A', orderCount: 0 });

    // Day of week aggregation
    const dayOfWeekStats: Record<string, { orders: number; revenue: number; count: number }> = {};
    for (const day of dailyTrends) {
      if (!dayOfWeekStats[day.dayOfWeek]) {
        dayOfWeekStats[day.dayOfWeek] = { orders: 0, revenue: 0, count: 0 };
      }
      dayOfWeekStats[day.dayOfWeek].orders += day.orderCount;
      dayOfWeekStats[day.dayOfWeek].revenue += day.revenue;
      dayOfWeekStats[day.dayOfWeek].count += 1;
    }

    const dayOfWeekAvg = Object.entries(dayOfWeekStats).map(([day, stats]) => ({
      day,
      avgOrders: stats.count > 0 ? stats.orders / stats.count : 0,
      avgRevenue: stats.count > 0 ? stats.revenue / stats.count : 0,
      totalOrders: stats.orders,
      totalRevenue: stats.revenue,
    }));

    return c.json({
      period: dateRange,
      dailyTrends,
      hourlyHeatmap,
      weekdayVsWeekend: {
        weekday: avgMetrics(weekdayData),
        weekend: avgMetrics(weekendData),
      },
      dayOfWeekPerformance: dayOfWeekAvg,
      peakHour: peakHour.hour,
      peakHourLabel: peakHour.hourLabel,
      peakDay: peakDay.dayOfWeek,
      peakDayDate: peakDay.date,
    });

  } catch (error) {
    console.error('[Insights] Error generating trends report:', error);
    return c.json({ error: 'Failed to generate trends report' }, 500);
  }
});

// ============ PRODUCT REPORTS ============

/**
 * GET /insights/products/top
 * Top Selling Products Report (Report #5)
 */
insights.get('/products/top', async (c) => {
  const shop = getShop(c);
  if (!shop) return c.json({ error: 'Shop not found' }, 401);

  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const period = c.req.query('period') || 'last30days';
    const limit = parseInt(c.req.query('limit') || '20');
    const sortBy = c.req.query('sortBy') || 'revenue'; // 'revenue' or 'units'

    const dateRange = startDate && endDate 
      ? { start: startDate, end: endDate }
      : getDateRange(period);

    const metricsService = new MetricsService(c.env);
    
    let products = await metricsService.getAggregatedProductMetrics(shop, dateRange.start, dateRange.end);
    
    // Sort by the requested field
    if (sortBy === 'units') {
      products = products.sort((a, b) => b.unitsSold - a.unitsSold);
    }
    // Default sort is already by revenue

    const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
    const totalUnits = products.reduce((sum, p) => sum + p.unitsSold, 0);

    const topProducts = products.slice(0, limit).map((p, index) => ({
      rank: index + 1,
      productId: p.productId,
      productTitle: p.productTitle,
      revenue: p.revenue,
      unitsSold: p.unitsSold,
      netRevenue: p.netRevenue,
      unitsRefunded: p.unitsRefunded || 0,
      refundAmount: p.refundAmount || 0,
      refundRate: p.refundRate || 0,
      revenueShare: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0,
      unitsShare: totalUnits > 0 ? (p.unitsSold / totalUnits) * 100 : 0,
    }));

    return c.json({
      period: dateRange,
      products: topProducts,
      totalProducts: products.length,
      totalRevenue,
      totalUnits,
      sortedBy: sortBy,
    });

  } catch (error) {
    console.error('[Insights] Error generating top products report:', error);
    return c.json({ error: 'Failed to generate top products report' }, 500);
  }
});

/**
 * GET /insights/products/trends
 * Product Performance Trends Report (Report #6)
 */
insights.get('/products/trends', async (c) => {
  const shop = getShop(c);
  if (!shop) return c.json({ error: 'Shop not found' }, 401);

  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const period = c.req.query('period') || 'last30days';
    const limit = parseInt(c.req.query('limit') || '10');

    const dateRange = startDate && endDate 
      ? { start: startDate, end: endDate }
      : getDateRange(period);

    const metricsService = new MetricsService(c.env);
    
    // Get current and previous period for comparison
    const compRange = getComparisonRange(dateRange.start, dateRange.end);
    
    const currentProducts = await metricsService.getAggregatedProductMetrics(shop, dateRange.start, dateRange.end);
    const previousProducts = await metricsService.getAggregatedProductMetrics(shop, compRange.start, compRange.end);

    // Calculate days in period for velocity
    const periodDays = Math.ceil(
      (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    // Build comparison map
    const previousMap = new Map(previousProducts.map(p => [p.productId, p]));

    const productsWithTrends = currentProducts.map(p => {
      const previous = previousMap.get(p.productId);
      const revenueChange = previous 
        ? ((p.revenue - previous.revenue) / previous.revenue) * 100 
        : 100;
      const unitsChange = previous 
        ? ((p.unitsSold - previous.unitsSold) / previous.unitsSold) * 100 
        : 100;

      return {
        productId: p.productId,
        productTitle: p.productTitle,
        currentRevenue: p.revenue,
        previousRevenue: previous?.revenue || 0,
        revenueChange,
        currentUnits: p.unitsSold,
        previousUnits: previous?.unitsSold || 0,
        unitsChange,
        salesVelocity: periodDays > 0 ? p.unitsSold / periodDays : 0, // units per day
        revenueVelocity: periodDays > 0 ? p.revenue / periodDays : 0, // revenue per day
        trend: revenueChange > 10 ? 'growing' : revenueChange < -10 ? 'declining' : 'stable',
      };
    });

    // Best and worst performers
    const bestPerformers = [...productsWithTrends]
      .sort((a, b) => b.revenueChange - a.revenueChange)
      .slice(0, limit);
    
    const worstPerformers = [...productsWithTrends]
      .filter(p => p.previousRevenue > 0) // Only include products that had sales before
      .sort((a, b) => a.revenueChange - b.revenueChange)
      .slice(0, limit);

    // New products (no previous sales)
    const newProducts = productsWithTrends
      .filter(p => !previousMap.has(p.productId))
      .slice(0, limit);

    return c.json({
      period: dateRange,
      comparisonPeriod: compRange,
      bestPerformers,
      worstPerformers,
      newProducts,
      allProducts: productsWithTrends.slice(0, 50), // Limit to 50 for performance
    });

  } catch (error) {
    console.error('[Insights] Error generating product trends report:', error);
    return c.json({ error: 'Failed to generate product trends report' }, 500);
  }
});

/**
 * GET /insights/products/lifecycle
 * Product Lifecycle Report (Report #8)
 */
insights.get('/products/lifecycle', async (c) => {
  const shop = getShop(c);
  if (!shop) return c.json({ error: 'Shop not found' }, 401);

  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const period = c.req.query('period') || 'last30days';
    const refundThreshold = parseFloat(c.req.query('refundThreshold') || '10'); // 10% default

    const dateRange = startDate && endDate 
      ? { start: startDate, end: endDate }
      : getDateRange(period);

    const metricsService = new MetricsService(c.env);
    
    // Get current and previous period
    const compRange = getComparisonRange(dateRange.start, dateRange.end);
    
    const currentProducts = await metricsService.getAggregatedProductMetrics(shop, dateRange.start, dateRange.end);
    const previousProducts = await metricsService.getAggregatedProductMetrics(shop, compRange.start, compRange.end);
    
    // Get all products ever sold
    const allProductsEver = await metricsService.getAllProductsEverSold(shop);
    
    // Current period product IDs
    const currentProductIds = new Set(currentProducts.map(p => p.productId));
    const previousMap = new Map(previousProducts.map(p => [p.productId, p]));

    // Products with declining sales (sold before, selling less now or not at all)
    const decliningProducts = previousProducts
      .filter(prev => {
        const current = currentProducts.find(c => c.productId === prev.productId);
        if (!current) return true; // Not sold in current period
        return current.revenue < prev.revenue * 0.5; // Less than 50% of previous revenue
      })
      .map(prev => {
        const current = currentProducts.find(c => c.productId === prev.productId);
        return {
          productId: prev.productId,
          productTitle: prev.productTitle,
          previousRevenue: prev.revenue,
          currentRevenue: current?.revenue || 0,
          decline: prev.revenue > 0 
            ? (((current?.revenue || 0) - prev.revenue) / prev.revenue) * 100 
            : -100,
          previousUnits: prev.unitsSold,
          currentUnits: current?.unitsSold || 0,
        };
      })
      .sort((a, b) => a.decline - b.decline);

    // Products with high refund rates
    const highRefundProducts = currentProducts
      .filter(p => (p.refundRate || 0) >= refundThreshold)
      .map(p => ({
        productId: p.productId,
        productTitle: p.productTitle,
        revenue: p.revenue,
        unitsSold: p.unitsSold,
        unitsRefunded: p.unitsRefunded || 0,
        refundAmount: p.refundAmount || 0,
        refundRate: p.refundRate || 0,
      }))
      .sort((a, b) => b.refundRate - a.refundRate);

    // Products never sold in recent period but sold before
    const neverSoldRecently = allProductsEver
      .filter(p => !currentProductIds.has(p.productId))
      .map(p => ({
        productId: p.productId,
        productTitle: p.productTitle,
        lastSaleDate: p.lastSaleDate,
        daysSinceLastSale: Math.floor(
          (new Date().getTime() - new Date(p.lastSaleDate).getTime()) / (1000 * 60 * 60 * 24)
        ),
        totalUnitsSold: p.totalUnitsSold,
      }))
      .sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale);

    // Top performers for comparison
    const topPerformers = currentProducts
      .slice(0, 10)
      .map(p => ({
        productId: p.productId,
        productTitle: p.productTitle,
        revenue: p.revenue,
        unitsSold: p.unitsSold,
        netRevenue: p.netRevenue,
      }));

    return c.json({
      period: dateRange,
      comparisonPeriod: compRange,
      decliningProducts: decliningProducts.slice(0, 20),
      highRefundProducts: highRefundProducts.slice(0, 20),
      neverSoldRecently: neverSoldRecently.slice(0, 20),
      topPerformers,
      summary: {
        totalProducts: allProductsEver.length,
        activeProducts: currentProducts.length,
        decliningCount: decliningProducts.length,
        highRefundCount: highRefundProducts.length,
        inactiveCount: neverSoldRecently.length,
      },
    });

  } catch (error) {
    console.error('[Insights] Error generating lifecycle report:', error);
    return c.json({ error: 'Failed to generate lifecycle report' }, 500);
  }
});

// ============ CUSTOMER REPORTS ============

/**
 * GET /insights/customers/growth
 * Customer Growth Report (Report #9)
 */
insights.get('/customers/growth', async (c) => {
  const shop = getShop(c);
  if (!shop) return c.json({ error: 'Shop not found' }, 401);

  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const period = c.req.query('period') || 'last30days';

    const dateRange = startDate && endDate 
      ? { start: startDate, end: endDate }
      : getDateRange(period);

    const metricsService = new MetricsService(c.env);
    
    // Get current and comparison periods
    const compRange = getComparisonRange(dateRange.start, dateRange.end);
    
    const currentGrowth = await metricsService.getCustomerGrowthMetrics(shop, dateRange.start, dateRange.end);
    const previousGrowth = await metricsService.getCustomerGrowthMetrics(shop, compRange.start, compRange.end);

    // Calculate growth rate
    const growthRate = previousGrowth.totalNew > 0
      ? ((currentGrowth.totalNew - previousGrowth.totalNew) / previousGrowth.totalNew) * 100
      : 0;

    return c.json({
      period: dateRange,
      comparisonPeriod: compRange,
      totalNewCustomers: currentGrowth.totalNew,
      totalReturningCustomers: currentGrowth.totalReturning,
      previousNewCustomers: previousGrowth.totalNew,
      previousReturningCustomers: previousGrowth.totalReturning,
      growthRate,
      newCustomersPerDay: currentGrowth.dailyBreakdown.map(d => ({
        date: d.date,
        newCustomers: d.new_customers,
        returningCustomers: d.returning_customers,
      })),
      averageNewPerDay: currentGrowth.dailyBreakdown.length > 0
        ? currentGrowth.totalNew / currentGrowth.dailyBreakdown.length
        : 0,
    });

  } catch (error) {
    console.error('[Insights] Error generating customer growth report:', error);
    return c.json({ error: 'Failed to generate customer growth report' }, 500);
  }
});

/**
 * GET /insights/customers/repeat
 * Repeat vs New Customers Report (Report #10)
 */
insights.get('/customers/repeat', async (c) => {
  const shop = getShop(c);
  if (!shop) return c.json({ error: 'Shop not found' }, 401);

  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const period = c.req.query('period') || 'last30days';

    const dateRange = startDate && endDate 
      ? { start: startDate, end: endDate }
      : getDateRange(period);

    const metricsService = new MetricsService(c.env);
    
    const dailyMetrics = await metricsService.getDailyMetricsRange(shop, dateRange.start, dateRange.end);
    const currentMetrics = metricsService.aggregateToPeriodMetrics(dailyMetrics);
    const customerStats = await metricsService.getCustomerValueStats(shop);

    // Calculate revenue split
    const totalOrders = currentMetrics.newCustomerOrders + currentMetrics.returningCustomerOrders;
    const repeatPurchaseRate = customerStats.totalCustomers > 0
      ? (customerStats.repeatCustomers / customerStats.totalCustomers) * 100
      : 0;

    return c.json({
      period: dateRange,
      firstTimeBuyers: currentMetrics.newCustomerOrders,
      repeatBuyers: currentMetrics.returningCustomerOrders,
      totalOrders,
      ordersPerCustomer: customerStats.avgOrdersPerCustomer,
      repeatPurchaseRate,
      revenueSplit: {
        newCustomerOrders: currentMetrics.newCustomerOrders,
        returningCustomerOrders: currentMetrics.returningCustomerOrders,
        newCustomerPercentage: totalOrders > 0 
          ? (currentMetrics.newCustomerOrders / totalOrders) * 100 
          : 0,
        returningCustomerPercentage: totalOrders > 0 
          ? (currentMetrics.returningCustomerOrders / totalOrders) * 100 
          : 0,
      },
      customerBase: {
        totalCustomers: customerStats.totalCustomers,
        oneTimeCustomers: customerStats.oneTimeCustomers,
        repeatCustomers: customerStats.repeatCustomers,
      },
      dailyBreakdown: dailyMetrics.map(d => ({
        date: d.date,
        newCustomerOrders: d.new_customer_orders,
        returningCustomerOrders: d.returning_customer_orders,
      })),
    });

  } catch (error) {
    console.error('[Insights] Error generating repeat customers report:', error);
    return c.json({ error: 'Failed to generate repeat customers report' }, 500);
  }
});

/**
 * GET /insights/customers/value
 * Customer Lifetime Value Report (Report #11)
 */
insights.get('/customers/value', async (c) => {
  const shop = getShop(c);
  if (!shop) return c.json({ error: 'Shop not found' }, 401);

  try {
    const limit = parseInt(c.req.query('limit') || '20');

    const metricsService = new MetricsService(c.env);
    
    const customerStats = await metricsService.getCustomerValueStats(shop);
    const topCustomersBySpend = await metricsService.getAllCustomerLifetime(shop, limit, 'total_spent');
    const topCustomersByOrders = await metricsService.getAllCustomerLifetime(shop, limit, 'total_orders');

    // Format top customers
    const formatCustomer = (c: any) => ({
      customerId: c.customer_id,
      email: c.email,
      totalOrders: c.total_orders,
      totalSpent: c.total_spent,
      totalRefunded: c.total_refunded,
      netSpent: c.total_spent - c.total_refunded,
      averageOrderValue: c.average_order_value,
      firstOrderDate: c.first_order_date,
      lastOrderDate: c.last_order_date,
      isRepeatCustomer: c.is_repeat_customer === 1,
    });

    return c.json({
      lifetimeValue: {
        average: customerStats.avgLifetimeValue,
        total: customerStats.totalRevenue,
      },
      averageSpendPerCustomer: customerStats.avgLifetimeValue,
      averageOrdersPerCustomer: customerStats.avgOrdersPerCustomer,
      topCustomersBySpend: topCustomersBySpend.map(formatCustomer),
      topCustomersByOrders: topCustomersByOrders.map(formatCustomer),
      oneTimeVsLoyal: {
        oneTime: {
          count: customerStats.oneTimeCustomers,
          percentage: customerStats.totalCustomers > 0 
            ? (customerStats.oneTimeCustomers / customerStats.totalCustomers) * 100 
            : 0,
        },
        loyal: {
          count: customerStats.repeatCustomers,
          percentage: customerStats.totalCustomers > 0 
            ? (customerStats.repeatCustomers / customerStats.totalCustomers) * 100 
            : 0,
        },
      },
      repeatPurchaseRate: customerStats.totalCustomers > 0
        ? (customerStats.repeatCustomers / customerStats.totalCustomers) * 100
        : 0,
      totalCustomers: customerStats.totalCustomers,
    });

  } catch (error) {
    console.error('[Insights] Error generating customer value report:', error);
    return c.json({ error: 'Failed to generate customer value report' }, 500);
  }
});

/**
 * GET /insights/customers/geography
 * Customer Geography Report (Report #12)
 */
insights.get('/customers/geography', async (c) => {
  const shop = getShop(c);
  if (!shop) {
    return c.json({ error: 'Shop not found' }, 400);
  }

  try {
    const metricsService = new MetricsService(c.env);
    const geography = await metricsService.getCustomerGeography(shop);
    
    // Calculate totals and percentages
    const totalCustomers = geography.reduce((sum, g) => sum + g.customer_count, 0);
    const totalSpent = geography.reduce((sum, g) => sum + g.total_spent, 0);
    const totalOrders = geography.reduce((sum, g) => sum + g.total_orders, 0);
    
    // Format for pie chart consumption
    const data = geography.map(g => ({
      name: g.country,
      code: g.country_code,
      value: g.customer_count,
      percentage: totalCustomers > 0 ? (g.customer_count / totalCustomers * 100).toFixed(1) : '0',
      totalSpent: g.total_spent,
      totalOrders: g.total_orders,
      avgSpentPerCustomer: g.customer_count > 0 ? g.total_spent / g.customer_count : 0,
      avgOrdersPerCustomer: g.customer_count > 0 ? g.total_orders / g.customer_count : 0,
    }));

    return c.json({
      data,
      totalCustomers,
      totalSpent,
      totalOrders,
      topCountries: data.slice(0, 10),
    });

  } catch (error) {
    console.error('[Insights] Error fetching customer geography:', error);
    return c.json({ error: 'Failed to fetch customer geography' }, 500);
  }
});

// ============ EXISTING ENDPOINTS (kept for backwards compatibility) ============

/**
 * GET /insights/report
 * Get analytics report with insights (legacy endpoint)
 */
insights.get('/report', async (c) => {
  const shop = getShop(c);
  
  if (!shop) {
    return c.json({ error: 'Shop not found' }, 401);
  }

  try {
    const period = c.req.query('period') || 'last30days';
    const customStart = c.req.query('startDate');
    const customEnd = c.req.query('endDate');
    const compare = c.req.query('compare') !== 'none';

    // Determine date range
    let dateRange: { start: string; end: string };
    if (customStart && customEnd) {
      dateRange = { start: customStart, end: customEnd };
    } else {
      dateRange = getDateRange(period);
    }

    const metricsService = new MetricsService(c.env);
    const analyticsEngine = new AnalyticsEngine();

    // Get current period metrics
    const dailyMetrics = await metricsService.getDailyMetricsRange(shop, dateRange.start, dateRange.end);
    const currentMetrics = metricsService.calculateAOV(metricsService.aggregateToPeriodMetrics(dailyMetrics));
    const currentProducts = await metricsService.getAggregatedProductMetrics(shop, dateRange.start, dateRange.end);

    // Get comparison period metrics if requested
    let comparisonMetrics: PeriodMetrics | null = null;
    let comparisonProducts: any[] = [];
    let comparisonRange: { start: string; end: string } | null = null;

    if (compare) {
      comparisonRange = getComparisonRange(dateRange.start, dateRange.end);
      const comparisonDaily = await metricsService.getDailyMetricsRange(shop, comparisonRange.start, comparisonRange.end);
      comparisonMetrics = metricsService.calculateAOV(metricsService.aggregateToPeriodMetrics(comparisonDaily));
      comparisonProducts = await metricsService.getAggregatedProductMetrics(shop, comparisonRange.start, comparisonRange.end);
    }

    // Generate report
    const report = analyticsEngine.generateReport(
      currentMetrics,
      comparisonMetrics,
      currentProducts,
      comparisonProducts,
      dateRange.start,
      dateRange.end,
      comparisonRange?.start,
      comparisonRange?.end
    );

    // Add daily trend analysis
    if (dailyMetrics.length >= 3) {
      const trendInsights = analyticsEngine.analyzeDailyTrends(dailyMetrics);
      report.insights.push(...trendInsights);
      report.insights.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
      report.insights = report.insights.slice(0, 10);
    }

    // Add summary text
    const summary = analyticsEngine.generateSummary(report);

    return c.json({
      ...report,
      summary,
      daily_data: dailyMetrics, // Include raw daily data for charts
    });

  } catch (error) {
    console.error('[Insights] Error generating report:', error);
    return c.json({ 
      error: 'Failed to generate report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /insights/daily
 * Get daily metrics for charts
 */
insights.get('/daily', async (c) => {
  const shop = getShop(c);
  
  if (!shop) {
    return c.json({ error: 'Shop not found' }, 401);
  }

  try {
    const period = c.req.query('period') || 'last30days';
    const customStart = c.req.query('startDate');
    const customEnd = c.req.query('endDate');

    let dateRange: { start: string; end: string };
    if (customStart && customEnd) {
      dateRange = { start: customStart, end: customEnd };
    } else {
      dateRange = getDateRange(period);
    }

    const metricsService = new MetricsService(c.env);
    const dailyMetrics = await metricsService.getDailyMetricsRange(shop, dateRange.start, dateRange.end);

    return c.json({
      period: dateRange,
      data: dailyMetrics
    });

  } catch (error) {
    console.error('[Insights] Error fetching daily metrics:', error);
    return c.json({ error: 'Failed to fetch daily metrics' }, 500);
  }
});

/**
 * GET /insights/products
 * Get product performance metrics (legacy endpoint)
 */
insights.get('/products', async (c) => {
  const shop = getShop(c);
  
  if (!shop) {
    return c.json({ error: 'Shop not found' }, 401);
  }

  try {
    const period = c.req.query('period') || 'last30days';
    const customStart = c.req.query('startDate');
    const customEnd = c.req.query('endDate');
    const limit = parseInt(c.req.query('limit') || '20');

    let dateRange: { start: string; end: string };
    if (customStart && customEnd) {
      dateRange = { start: customStart, end: customEnd };
    } else {
      dateRange = getDateRange(period);
    }

    const metricsService = new MetricsService(c.env);
    const products = await metricsService.getAggregatedProductMetrics(shop, dateRange.start, dateRange.end);

    return c.json({
      period: dateRange,
      products: products.slice(0, limit),
      total_products: products.length
    });

  } catch (error) {
    console.error('[Insights] Error fetching product metrics:', error);
    return c.json({ error: 'Failed to fetch product metrics' }, 500);
  }
});

/**
 * GET /insights/events
 * Get significant shop events
 */
insights.get('/events', async (c) => {
  const shop = getShop(c);
  
  if (!shop) {
    return c.json({ error: 'Shop not found' }, 401);
  }

  try {
    const period = c.req.query('period') || 'last30days';
    const customStart = c.req.query('startDate');
    const customEnd = c.req.query('endDate');

    let dateRange: { start: string; end: string };
    if (customStart && customEnd) {
      dateRange = { start: customStart, end: customEnd };
    } else {
      dateRange = getDateRange(period);
    }

    const metricsService = new MetricsService(c.env);
    const events = await metricsService.getEventsRange(shop, dateRange.start, dateRange.end);

    return c.json({
      period: dateRange,
      events
    });

  } catch (error) {
    console.error('[Insights] Error fetching events:', error);
    return c.json({ error: 'Failed to fetch events' }, 500);
  }
});

/**
 * GET /insights/summary
 * Quick summary for dashboard
 */
insights.get('/summary', async (c) => {
  const shop = getShop(c);
  
  if (!shop) {
    return c.json({ error: 'Shop not found' }, 401);
  }

  try {
    const metricsService = new MetricsService(c.env);
    const analyticsEngine = new AnalyticsEngine();

    // Get today vs yesterday
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    const todayMetrics = await metricsService.getDailyMetrics(shop, today);
    const yesterdayMetrics = await metricsService.getDailyMetrics(shop, yesterday);

    // Get this month vs last month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const thisMonthDaily = await metricsService.getDailyMetricsRange(shop, thisMonthStart, today);
    const lastMonthDaily = await metricsService.getDailyMetricsRange(shop, lastMonthStart, lastMonthEnd);

    const thisMonthMetrics = metricsService.calculateAOV(metricsService.aggregateToPeriodMetrics(thisMonthDaily));
    const lastMonthMetrics = metricsService.calculateAOV(metricsService.aggregateToPeriodMetrics(lastMonthDaily));

    // Calculate NET revenue for today and yesterday
    const todayGross = todayMetrics?.total_revenue || 0;
    const todayCancelled = todayMetrics?.cancelled_revenue || 0;
    const todayRefunds = todayMetrics?.total_refunds || 0;
    const todayRevenue = todayGross - todayCancelled - todayRefunds;

    const yesterdayGross = yesterdayMetrics?.total_revenue || 0;
    const yesterdayCancelled = yesterdayMetrics?.cancelled_revenue || 0;
    const yesterdayRefunds = yesterdayMetrics?.total_refunds || 0;
    const yesterdayRevenue = yesterdayGross - yesterdayCancelled - yesterdayRefunds;

    const dailyChange = yesterdayRevenue > 0 
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
      : 0;

    const monthlyChange = lastMonthMetrics.revenue > 0
      ? ((thisMonthMetrics.revenue - lastMonthMetrics.revenue) / lastMonthMetrics.revenue) * 100
      : 0;

    return c.json({
      today: {
        revenue: todayRevenue,
        grossRevenue: todayGross,
        orders: todayMetrics?.total_orders || 0,
        change: dailyChange
      },
      this_month: {
        revenue: thisMonthMetrics.revenue,
        grossRevenue: thisMonthMetrics.grossRevenue,
        orders: thisMonthMetrics.orders,
        aov: thisMonthMetrics.aov,
        change: monthlyChange
      },
      trends: {
        daily: dailyChange > 5 ? 'up' : dailyChange < -5 ? 'down' : 'stable',
        monthly: monthlyChange > 5 ? 'up' : monthlyChange < -5 ? 'down' : 'stable'
      }
    });

  } catch (error) {
    console.error('[Insights] Error fetching summary:', error);
    return c.json({ error: 'Failed to fetch summary' }, 500);
  }
});

/**
 * GET /insights/orders/breakdown
 * Get order breakdown by type (legacy endpoint)
 */
insights.get('/orders/breakdown', async (c) => {
  const shop = getShop(c);
  
  if (!shop) {
    return c.json({ error: 'Shop not found' }, 401);
  }

  try {
    const breakdownType = c.req.query('type') as OrderBreakdownType;
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    // Validate breakdown type
    const validTypes: OrderBreakdownType[] = ['fulfillment_status', 'financial_status', 'channel', 'payment_method', 'discount', 'country'];
    if (!breakdownType || !validTypes.includes(breakdownType)) {
      return c.json({ error: 'Invalid breakdown type. Must be one of: fulfillment_status, financial_status, channel, payment_method, discount, country' }, 400);
    }

    // Validate dates
    if (!startDate || !endDate) {
      return c.json({ error: 'startDate and endDate are required' }, 400);
    }

    const metricsService = new MetricsService(c.env);
    const breakdown = await metricsService.getAggregatedOrderBreakdown(shop, startDate, endDate, breakdownType);

    // Format breakdown values for display
    const formattedBreakdown = breakdown.map(item => ({
      name: formatStatusValue(item.breakdown_value),
      value: item.order_count,
      revenue: item.revenue,
    }));

    return c.json({
      type: breakdownType,
      period: { start: startDate, end: endDate },
      data: formattedBreakdown,
      total_orders: formattedBreakdown.reduce((sum, item) => sum + item.value, 0),
      total_revenue: formattedBreakdown.reduce((sum, item) => sum + item.revenue, 0),
    });

  } catch (error) {
    console.error('[Insights] Error fetching order breakdown:', error);
    return c.json({ error: 'Failed to fetch order breakdown' }, 500);
  }
});

/**
 * Format status/breakdown values for display
 */
function formatStatusValue(value: string): string {
  if (!value) return 'Unknown';
  
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

export default insights;
