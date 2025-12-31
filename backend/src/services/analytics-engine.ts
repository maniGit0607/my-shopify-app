import { 
  PeriodMetrics, 
  ProductPeriodMetrics, 
  Insight, 
  InsightSeverity,
  AnalyticsReport,
  DailyMetrics
} from '../types';

/**
 * Rule-based Analytics Engine
 * Analyzes metrics and generates insights without LLM
 */
export class AnalyticsEngine {

  // ============ Main Analysis Methods ============

  /**
   * Generate full analytics report with insights
   */
  generateReport(
    currentMetrics: PeriodMetrics,
    comparisonMetrics: PeriodMetrics | null,
    currentProducts: ProductPeriodMetrics[],
    comparisonProducts: ProductPeriodMetrics[],
    periodStart: string,
    periodEnd: string,
    comparisonStart?: string,
    comparisonEnd?: string
  ): AnalyticsReport {
    const insights: Insight[] = [];

    // Generate insights from comparison
    if (comparisonMetrics) {
      insights.push(...this.analyzeRevenueChange(currentMetrics, comparisonMetrics));
      insights.push(...this.analyzeOrderChange(currentMetrics, comparisonMetrics));
      insights.push(...this.analyzeCustomerMix(currentMetrics, comparisonMetrics));
      insights.push(...this.analyzeRefundTrend(currentMetrics, comparisonMetrics));
      insights.push(...this.analyzeDiscountUsage(currentMetrics, comparisonMetrics));
      insights.push(...this.analyzeProductContribution(currentProducts, comparisonProducts, currentMetrics, comparisonMetrics));
    }

    // Sort insights by absolute impact
    insights.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

    return {
      period: { start: periodStart, end: periodEnd },
      comparison_period: comparisonStart && comparisonEnd 
        ? { start: comparisonStart, end: comparisonEnd }
        : undefined,
      metrics: currentMetrics,
      comparison_metrics: comparisonMetrics || undefined,
      insights: insights.slice(0, 10), // Top 10 insights
      top_products: currentProducts.slice(0, 10),
      trends: {
        revenue_trend: this.calculateTrend(currentMetrics.revenue, comparisonMetrics?.revenue),
        orders_trend: this.calculateTrend(currentMetrics.orders, comparisonMetrics?.orders),
        aov_trend: this.calculateTrend(currentMetrics.aov, comparisonMetrics?.aov),
      }
    };
  }

  // ============ Revenue Analysis Rules ============

  /**
   * Analyze why revenue changed
   */
  analyzeRevenueChange(current: PeriodMetrics, previous: PeriodMetrics): Insight[] {
    const insights: Insight[] = [];
    
    const revenueDelta = current.revenue - previous.revenue;
    const revenueChangePercent = previous.revenue > 0 
      ? (revenueDelta / previous.revenue) * 100 
      : 0;

    // Skip if change is minimal (< 5%)
    if (Math.abs(revenueChangePercent) < 5) {
      if (Math.abs(revenueChangePercent) < 2) {
        insights.push({
          factor: 'revenue_stable',
          impact: revenueDelta,
          message: `Revenue is stable (${revenueChangePercent >= 0 ? '+' : ''}${revenueChangePercent.toFixed(1)}%)`,
          severity: 'info'
        });
      }
      return insights;
    }

    const isDecline = revenueDelta < 0;
    
    // Decompose: Revenue = Orders × AOV
    const ordersDelta = current.orders - previous.orders;
    const ordersChangePercent = previous.orders > 0 
      ? (ordersDelta / previous.orders) * 100 
      : 0;
    
    const aovDelta = current.aov - previous.aov;
    const aovChangePercent = previous.aov > 0 
      ? (aovDelta / previous.aov) * 100 
      : 0;

    // Calculate contribution of each factor
    const orderContribution = ordersDelta * previous.aov;
    const aovContribution = aovDelta * current.orders;
    const mixedContribution = ordersDelta * aovDelta;

    // Primary insight
    const direction = isDecline ? 'decreased' : 'increased';
    insights.push({
      factor: 'revenue_change',
      impact: revenueDelta,
      message: `Revenue ${direction} by ${Math.abs(revenueChangePercent).toFixed(1)}% ($${Math.abs(revenueDelta).toFixed(2)})`,
      severity: this.getSeverity(revenueChangePercent, isDecline)
    });

    // Determine primary driver
    if (Math.abs(orderContribution) > Math.abs(aovContribution)) {
      const orderDirection = ordersDelta < 0 ? 'Fewer' : 'More';
      insights.push({
        factor: 'order_volume_driver',
        impact: orderContribution,
        message: `${orderDirection} orders (${ordersChangePercent >= 0 ? '+' : ''}${ordersChangePercent.toFixed(1)}%) is the primary driver`,
        severity: this.getSeverity(ordersChangePercent, ordersDelta < 0),
        details: { ordersDelta, ordersChangePercent }
      });
    } else {
      const aovDirection = aovDelta < 0 ? 'Lower' : 'Higher';
      insights.push({
        factor: 'aov_driver',
        impact: aovContribution,
        message: `${aovDirection} average order value (${aovChangePercent >= 0 ? '+' : ''}${aovChangePercent.toFixed(1)}%) is the primary driver`,
        severity: this.getSeverity(aovChangePercent, aovDelta < 0),
        details: { aovDelta, aovChangePercent, currentAOV: current.aov, previousAOV: previous.aov }
      });
    }

    return insights;
  }

  // ============ Order Analysis Rules ============

  /**
   * Analyze order trends
   */
  analyzeOrderChange(current: PeriodMetrics, previous: PeriodMetrics): Insight[] {
    const insights: Insight[] = [];
    
    const ordersDelta = current.orders - previous.orders;
    const ordersChangePercent = previous.orders > 0 
      ? (ordersDelta / previous.orders) * 100 
      : 0;

    // Items per order analysis
    const currentItemsPerOrder = current.orders > 0 ? current.itemsSold / current.orders : 0;
    const previousItemsPerOrder = previous.orders > 0 ? previous.itemsSold / previous.orders : 0;
    const itemsPerOrderChange = previousItemsPerOrder > 0
      ? ((currentItemsPerOrder - previousItemsPerOrder) / previousItemsPerOrder) * 100
      : 0;

    if (Math.abs(itemsPerOrderChange) > 10) {
      const direction = itemsPerOrderChange > 0 ? 'more' : 'fewer';
      insights.push({
        factor: 'basket_size',
        impact: (currentItemsPerOrder - previousItemsPerOrder) * current.orders * (current.aov / currentItemsPerOrder),
        message: `Customers are buying ${direction} items per order (${itemsPerOrderChange >= 0 ? '+' : ''}${itemsPerOrderChange.toFixed(1)}%)`,
        severity: itemsPerOrderChange < -10 ? 'warning' : 'info',
        details: { currentItemsPerOrder: currentItemsPerOrder.toFixed(2), previousItemsPerOrder: previousItemsPerOrder.toFixed(2) }
      });
    }

    return insights;
  }

  // ============ Customer Mix Rules ============

  /**
   * Analyze new vs returning customer mix
   */
  analyzeCustomerMix(current: PeriodMetrics, previous: PeriodMetrics): Insight[] {
    const insights: Insight[] = [];

    // Calculate ratios
    const currentNewRatio = current.orders > 0 
      ? current.newCustomerOrders / current.orders 
      : 0;
    const previousNewRatio = previous.orders > 0 
      ? previous.newCustomerOrders / previous.orders 
      : 0;

    const newCustomerDelta = current.newCustomerOrders - previous.newCustomerOrders;
    const returningDelta = current.returningCustomerOrders - previous.returningCustomerOrders;

    // Significant shift in customer mix
    const mixShift = (currentNewRatio - previousNewRatio) * 100;
    
    if (Math.abs(mixShift) > 10) {
      if (mixShift > 0) {
        insights.push({
          factor: 'customer_acquisition',
          impact: newCustomerDelta * current.aov,
          message: `Higher proportion of new customers (${(currentNewRatio * 100).toFixed(0)}% vs ${(previousNewRatio * 100).toFixed(0)}%)`,
          severity: 'info',
          details: { currentNewRatio, previousNewRatio }
        });
      } else {
        insights.push({
          factor: 'customer_retention',
          impact: returningDelta * current.aov,
          message: `Higher proportion of returning customers (${((1 - currentNewRatio) * 100).toFixed(0)}% vs ${((1 - previousNewRatio) * 100).toFixed(0)}%)`,
          severity: 'positive',
          details: { currentNewRatio, previousNewRatio }
        });
      }
    }

    // Alert on significant drop in new customers
    if (newCustomerDelta < 0 && previous.newCustomerOrders > 0) {
      const newCustomerDropPercent = (newCustomerDelta / previous.newCustomerOrders) * 100;
      if (newCustomerDropPercent < -20) {
        insights.push({
          factor: 'new_customer_decline',
          impact: newCustomerDelta * current.aov,
          message: `New customer acquisition dropped by ${Math.abs(newCustomerDropPercent).toFixed(0)}%`,
          severity: 'warning',
          details: { current: current.newCustomerOrders, previous: previous.newCustomerOrders }
        });
      }
    }

    // Alert on significant drop in returning customers
    if (returningDelta < 0 && previous.returningCustomerOrders > 0) {
      const returningDropPercent = (returningDelta / previous.returningCustomerOrders) * 100;
      if (returningDropPercent < -20) {
        insights.push({
          factor: 'returning_customer_decline',
          impact: returningDelta * current.aov,
          message: `Returning customer orders dropped by ${Math.abs(returningDropPercent).toFixed(0)}%`,
          severity: 'warning',
          details: { current: current.returningCustomerOrders, previous: previous.returningCustomerOrders }
        });
      }
    }

    return insights;
  }

  // ============ Refund Analysis Rules ============

  /**
   * Analyze refund trends
   */
  analyzeRefundTrend(current: PeriodMetrics, previous: PeriodMetrics): Insight[] {
    const insights: Insight[] = [];

    // Calculate refund rates
    const currentRefundRate = current.revenue > 0 
      ? (current.refundTotal / current.revenue) * 100 
      : 0;
    const previousRefundRate = previous.revenue > 0 
      ? (previous.refundTotal / previous.revenue) * 100 
      : 0;

    const refundRateDelta = currentRefundRate - previousRefundRate;

    // Alert on high or increasing refund rate
    if (currentRefundRate > 5) {
      insights.push({
        factor: 'high_refund_rate',
        impact: -current.refundTotal,
        message: `Refund rate is high at ${currentRefundRate.toFixed(1)}%`,
        severity: currentRefundRate > 10 ? 'critical' : 'warning',
        details: { refundRate: currentRefundRate, refundTotal: current.refundTotal }
      });
    }

    if (refundRateDelta > 2) {
      insights.push({
        factor: 'refund_rate_increase',
        impact: -(current.refundTotal - previous.refundTotal),
        message: `Refund rate increased from ${previousRefundRate.toFixed(1)}% to ${currentRefundRate.toFixed(1)}%`,
        severity: 'warning',
        details: { currentRate: currentRefundRate, previousRate: previousRefundRate }
      });
    }

    return insights;
  }

  // ============ Discount Analysis Rules ============

  /**
   * Analyze discount usage
   */
  analyzeDiscountUsage(current: PeriodMetrics, previous: PeriodMetrics): Insight[] {
    const insights: Insight[] = [];

    // Calculate discount rates
    const currentDiscountRate = current.orders > 0 
      ? (current.ordersWithDiscount / current.orders) * 100 
      : 0;
    const previousDiscountRate = previous.orders > 0 
      ? (previous.ordersWithDiscount / previous.orders) * 100 
      : 0;

    const discountRateDelta = currentDiscountRate - previousDiscountRate;

    // Discount dependency warning
    if (currentDiscountRate > 50 && previousDiscountRate < 30) {
      insights.push({
        factor: 'discount_dependency',
        impact: -current.discountTotal,
        message: `Sales became heavily discount-dependent (${currentDiscountRate.toFixed(0)}% of orders used discounts)`,
        severity: 'warning',
        details: { currentRate: currentDiscountRate, previousRate: previousDiscountRate }
      });
    }

    // Promo ended insight
    if (previousDiscountRate > 40 && currentDiscountRate < 20) {
      const discountImpact = previous.discountTotal - current.discountTotal;
      insights.push({
        factor: 'promo_ended',
        impact: discountImpact,
        message: `A promotion appears to have ended (discount usage dropped from ${previousDiscountRate.toFixed(0)}% to ${currentDiscountRate.toFixed(0)}%)`,
        severity: 'info',
        details: { discountChange: discountImpact }
      });
    }

    // Average discount per order
    const currentAvgDiscount = current.ordersWithDiscount > 0 
      ? current.discountTotal / current.ordersWithDiscount 
      : 0;
    const previousAvgDiscount = previous.ordersWithDiscount > 0 
      ? previous.discountTotal / previous.ordersWithDiscount 
      : 0;

    if (previousAvgDiscount > 0) {
      const avgDiscountChange = ((currentAvgDiscount - previousAvgDiscount) / previousAvgDiscount) * 100;
      if (Math.abs(avgDiscountChange) > 20) {
        const direction = avgDiscountChange > 0 ? 'larger' : 'smaller';
        insights.push({
          factor: 'discount_size_change',
          impact: (currentAvgDiscount - previousAvgDiscount) * current.ordersWithDiscount,
          message: `Average discount per order is ${direction} ($${currentAvgDiscount.toFixed(2)} vs $${previousAvgDiscount.toFixed(2)})`,
          severity: 'info'
        });
      }
    }

    return insights;
  }

  // ============ Product Analysis Rules ============

  /**
   * Analyze product contribution to revenue change
   */
  analyzeProductContribution(
    currentProducts: ProductPeriodMetrics[],
    previousProducts: ProductPeriodMetrics[],
    currentMetrics: PeriodMetrics,
    previousMetrics: PeriodMetrics
  ): Insight[] {
    const insights: Insight[] = [];
    
    const revenueDelta = currentMetrics.revenue - previousMetrics.revenue;
    if (Math.abs(revenueDelta) < 100) return insights; // Skip small changes

    // Create maps for easy lookup
    const previousMap = new Map(previousProducts.map(p => [p.productId, p]));
    const currentMap = new Map(currentProducts.map(p => [p.productId, p]));

    // Calculate changes for each product
    const productChanges: Array<{
      productId: string;
      productTitle: string;
      currentRevenue: number;
      previousRevenue: number;
      delta: number;
      contribution: number; // % of total revenue change
    }> = [];

    // Products in current period
    for (const current of currentProducts) {
      const previous = previousMap.get(current.productId);
      const prevRevenue = previous?.revenue || 0;
      const delta = current.revenue - prevRevenue;
      
      productChanges.push({
        productId: current.productId,
        productTitle: current.productTitle,
        currentRevenue: current.revenue,
        previousRevenue: prevRevenue,
        delta,
        contribution: revenueDelta !== 0 ? (delta / revenueDelta) * 100 : 0
      });
    }

    // Products only in previous period (stopped selling)
    for (const previous of previousProducts) {
      if (!currentMap.has(previous.productId)) {
        productChanges.push({
          productId: previous.productId,
          productTitle: previous.productTitle,
          currentRevenue: 0,
          previousRevenue: previous.revenue,
          delta: -previous.revenue,
          contribution: revenueDelta !== 0 ? (-previous.revenue / revenueDelta) * 100 : 0
        });
      }
    }

    // Sort by impact
    productChanges.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    // Top contributors to decline
    if (revenueDelta < 0) {
      const topDecliners = productChanges
        .filter(p => p.delta < 0)
        .slice(0, 3);

      if (topDecliners.length > 0) {
        const totalDeclineImpact = topDecliners.reduce((sum, p) => sum + Math.abs(p.delta), 0);
        const declinePercent = (totalDeclineImpact / Math.abs(revenueDelta)) * 100;

        insights.push({
          factor: 'product_decline',
          impact: -totalDeclineImpact,
          message: `Top declining products account for ${Math.min(declinePercent, 100).toFixed(0)}% of revenue drop`,
          severity: 'warning',
          details: topDecliners.map(p => ({
            product: p.productTitle,
            delta: p.delta,
            previousRevenue: p.previousRevenue,
            currentRevenue: p.currentRevenue
          }))
        });
      }
    }

    // Top contributors to growth
    if (revenueDelta > 0) {
      const topGrowers = productChanges
        .filter(p => p.delta > 0)
        .slice(0, 3);

      if (topGrowers.length > 0) {
        const totalGrowthImpact = topGrowers.reduce((sum, p) => sum + p.delta, 0);
        const growthPercent = (totalGrowthImpact / revenueDelta) * 100;

        insights.push({
          factor: 'product_growth',
          impact: totalGrowthImpact,
          message: `Top growing products drove ${Math.min(growthPercent, 100).toFixed(0)}% of revenue increase`,
          severity: 'positive',
          details: topGrowers.map(p => ({
            product: p.productTitle,
            delta: p.delta,
            previousRevenue: p.previousRevenue,
            currentRevenue: p.currentRevenue
          }))
        });
      }
    }

    // New products contribution
    const newProducts = productChanges.filter(p => p.previousRevenue === 0 && p.currentRevenue > 0);
    if (newProducts.length > 0) {
      const newProductRevenue = newProducts.reduce((sum, p) => sum + p.currentRevenue, 0);
      if (newProductRevenue > currentMetrics.revenue * 0.1) {
        insights.push({
          factor: 'new_products',
          impact: newProductRevenue,
          message: `${newProducts.length} new product(s) contributed $${newProductRevenue.toFixed(2)} (${((newProductRevenue / currentMetrics.revenue) * 100).toFixed(0)}% of revenue)`,
          severity: 'positive',
          details: newProducts.slice(0, 5).map(p => ({ product: p.productTitle, revenue: p.currentRevenue }))
        });
      }
    }

    // Products that stopped selling
    const stoppedProducts = productChanges.filter(p => p.currentRevenue === 0 && p.previousRevenue > 0);
    if (stoppedProducts.length > 0) {
      const lostRevenue = stoppedProducts.reduce((sum, p) => sum + p.previousRevenue, 0);
      if (lostRevenue > previousMetrics.revenue * 0.05) {
        insights.push({
          factor: 'stopped_products',
          impact: -lostRevenue,
          message: `${stoppedProducts.length} product(s) had no sales this period (previously $${lostRevenue.toFixed(2)})`,
          severity: 'warning',
          details: stoppedProducts.slice(0, 5).map(p => ({ product: p.productTitle, lostRevenue: p.previousRevenue }))
        });
      }
    }

    return insights;
  }

  // ============ Trend Analysis ============

  /**
   * Analyze daily trends for anomalies
   */
  analyzeDailyTrends(dailyMetrics: DailyMetrics[]): Insight[] {
    const insights: Insight[] = [];
    
    if (dailyMetrics.length < 3) return insights;

    // Calculate moving average and standard deviation
    const revenues = dailyMetrics.map(d => d.total_revenue);
    const mean = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const stdDev = Math.sqrt(
      revenues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / revenues.length
    );

    // Find anomalies (> 2 standard deviations)
    for (let i = 0; i < dailyMetrics.length; i++) {
      const day = dailyMetrics[i];
      const zScore = stdDev > 0 ? (day.total_revenue - mean) / stdDev : 0;

      if (Math.abs(zScore) > 2) {
        const direction = zScore > 0 ? 'spike' : 'dip';
        insights.push({
          factor: `daily_${direction}`,
          impact: day.total_revenue - mean,
          message: `Unusual ${direction} on ${day.date}: $${day.total_revenue.toFixed(2)} (${((day.total_revenue / mean - 1) * 100).toFixed(0)}% vs average)`,
          severity: direction === 'dip' ? 'warning' : 'positive',
          details: { date: day.date, revenue: day.total_revenue, average: mean }
        });
      }
    }

    return insights;
  }

  // ============ Helper Methods ============

  /**
   * Determine severity based on percentage change
   */
  private getSeverity(changePercent: number, isNegative: boolean): InsightSeverity {
    const absChange = Math.abs(changePercent);
    
    if (!isNegative) {
      if (absChange > 20) return 'positive';
      return 'info';
    }
    
    if (absChange > 30) return 'critical';
    if (absChange > 15) return 'warning';
    return 'info';
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(current: number, previous: number | undefined): 'up' | 'down' | 'stable' {
    if (previous === undefined || previous === 0) return 'stable';
    const changePercent = ((current - previous) / previous) * 100;
    
    if (changePercent > 5) return 'up';
    if (changePercent < -5) return 'down';
    return 'stable';
  }

  /**
   * Generate summary text for the report
   */
  generateSummary(report: AnalyticsReport): string {
    const { metrics, comparison_metrics, insights, trends } = report;
    
    let summary = '';

    // Revenue summary
    if (comparison_metrics) {
      const revenueChange = metrics.revenue - comparison_metrics.revenue;
      const revenueChangePercent = comparison_metrics.revenue > 0
        ? (revenueChange / comparison_metrics.revenue) * 100
        : 0;
      
      const direction = revenueChange >= 0 ? 'up' : 'down';
      summary += `📊 Revenue is ${direction} ${Math.abs(revenueChangePercent).toFixed(1)}% ($${Math.abs(revenueChange).toFixed(2)})\n\n`;
    } else {
      summary += `📊 Total Revenue: $${metrics.revenue.toFixed(2)}\n\n`;
    }

    // Key insights
    if (insights.length > 0) {
      summary += '🔍 Key Insights:\n';
      insights.slice(0, 3).forEach((insight, i) => {
        const emoji = insight.severity === 'critical' ? '🔴' 
          : insight.severity === 'warning' ? '🟡'
          : insight.severity === 'positive' ? '🟢'
          : 'ℹ️';
        summary += `${i + 1}. ${emoji} ${insight.message}\n`;
      });
    }

    return summary;
  }
}

