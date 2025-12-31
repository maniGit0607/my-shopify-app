import { Hono } from 'hono';
import { Env, AnalyticsReport, PeriodMetrics } from '../types';
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
 * GET /insights/report
 * Get analytics report with insights
 * Query params:
 *   - period: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear'
 *   - startDate: custom start date (YYYY-MM-DD)
 *   - endDate: custom end date (YYYY-MM-DD)
 *   - compare: 'previous' | 'none' (default: 'previous')
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
 * Get product performance metrics
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

    // Calculate changes
    const todayRevenue = todayMetrics?.total_revenue || 0;
    const yesterdayRevenue = yesterdayMetrics?.total_revenue || 0;
    const dailyChange = yesterdayRevenue > 0 
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
      : 0;

    const monthlyChange = lastMonthMetrics.revenue > 0
      ? ((thisMonthMetrics.revenue - lastMonthMetrics.revenue) / lastMonthMetrics.revenue) * 100
      : 0;

    return c.json({
      today: {
        revenue: todayRevenue,
        orders: todayMetrics?.total_orders || 0,
        change: dailyChange
      },
      this_month: {
        revenue: thisMonthMetrics.revenue,
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

export default insights;

