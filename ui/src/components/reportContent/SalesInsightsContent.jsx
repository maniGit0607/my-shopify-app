import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Select,
  Spinner,
  Banner,
  Badge,
  Box,
  Divider,
  ProgressBar,
  Icon,
} from '@shopify/polaris';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
} from '@shopify/polaris-icons';
import { useInsightsFetch } from '../../hooks/useInsightsFetch';

// Period options
const PERIOD_OPTIONS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: 'last7days' },
  { label: 'Last 30 days', value: 'last30days' },
  { label: 'This month', value: 'thisMonth' },
  { label: 'Last month', value: 'lastMonth' },
  { label: 'This quarter', value: 'thisQuarter' },
  { label: 'This year', value: 'thisYear' },
];

// Severity colors
const SEVERITY_COLORS = {
  critical: '#d72c0d',
  warning: '#b98900',
  info: '#2c6ecb',
  positive: '#008060',
};

const SEVERITY_BADGES = {
  critical: 'critical',
  warning: 'warning',
  info: 'info',
  positive: 'success',
};

/**
 * Format currency
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Format percentage
 */
function formatPercent(value) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Trend indicator component
 */
function TrendIndicator({ trend, value }) {
  if (trend === 'up') {
    return (
      <InlineStack gap="100" align="center">
        <Icon source={ArrowUpIcon} tone="success" />
        <Text tone="success">{formatPercent(value)}</Text>
      </InlineStack>
    );
  }
  if (trend === 'down') {
    return (
      <InlineStack gap="100" align="center">
        <Icon source={ArrowDownIcon} tone="critical" />
        <Text tone="critical">{formatPercent(value)}</Text>
      </InlineStack>
    );
  }
  return (
    <InlineStack gap="100" align="center">
      <Icon source={MinusIcon} tone="subdued" />
      <Text tone="subdued">Stable</Text>
    </InlineStack>
  );
}

/**
 * Metric card component
 */
function MetricCard({ title, value, comparison, trend, format = 'currency' }) {
  const formattedValue = format === 'currency' ? formatCurrency(value) : value?.toLocaleString();
  
  let changeValue = 0;
  if (comparison !== undefined && comparison !== 0) {
    changeValue = ((value - comparison) / comparison) * 100;
  }

  return (
    <Card>
      <BlockStack gap="200">
        <Text variant="bodyMd" tone="subdued">{title}</Text>
        <Text variant="headingLg" as="h3">{formattedValue}</Text>
        {comparison !== undefined && (
          <TrendIndicator trend={trend} value={changeValue} />
        )}
      </BlockStack>
    </Card>
  );
}

/**
 * Insight item component
 */
function InsightItem({ insight }) {
  const { message, severity, factor, impact, details } = insight;
  
  return (
    <Box 
      padding="300" 
      borderRadius="200" 
      background="bg-surface-secondary"
    >
      <BlockStack gap="200">
        <InlineStack align="space-between">
          <Badge tone={SEVERITY_BADGES[severity] || 'info'}>
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
          </Badge>
          {impact !== 0 && (
            <Text variant="bodySm" tone="subdued">
              Impact: {formatCurrency(Math.abs(impact))}
            </Text>
          )}
        </InlineStack>
        <Text variant="bodyMd">{message}</Text>
        {details && Array.isArray(details) && details.length > 0 && (
          <Box paddingBlockStart="100">
            <BlockStack gap="100">
              {details.slice(0, 3).map((detail, idx) => (
                <Text key={idx} variant="bodySm" tone="subdued">
                  • {detail.product || detail.name}: {formatCurrency(Math.abs(detail.delta || detail.revenue || detail.lostRevenue || 0))}
                </Text>
              ))}
            </BlockStack>
          </Box>
        )}
      </BlockStack>
    </Box>
  );
}

/**
 * Product performance item
 */
function ProductItem({ product, maxRevenue }) {
  const progress = maxRevenue > 0 ? (product.revenue / maxRevenue) * 100 : 0;
  
  return (
    <Box padding="200">
      <BlockStack gap="100">
        <InlineStack align="space-between">
          <Text variant="bodyMd" fontWeight="medium">
            {product.productTitle || 'Unknown Product'}
          </Text>
          <Text variant="bodyMd">{formatCurrency(product.revenue)}</Text>
        </InlineStack>
        <InlineStack align="space-between">
          <ProgressBar progress={progress} size="small" tone="primary" />
          <Text variant="bodySm" tone="subdued" >
            {product.unitsSold} units
          </Text>
        </InlineStack>
      </BlockStack>
    </Box>
  );
}

/**
 * Daily chart component (simple bar representation)
 */
function DailyChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <Box padding="400" background="bg-surface-secondary" borderRadius="200">
        <Text tone="subdued" alignment="center">No data available for this period</Text>
      </Box>
    );
  }

  const maxRevenue = Math.max(...data.map(d => d.total_revenue));
  
  return (
    <Box padding="200">
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '150px' }}>
        {data.map((day, idx) => {
          const height = maxRevenue > 0 ? (day.total_revenue / maxRevenue) * 100 : 0;
          return (
            <div
              key={idx}
              style={{
                flex: 1,
                height: `${Math.max(height, 2)}%`,
                backgroundColor: day.total_revenue > 0 ? '#2c6ecb' : '#e1e3e5',
                borderRadius: '2px 2px 0 0',
                minWidth: '4px',
                transition: 'height 0.3s ease',
              }}
              title={`${day.date}: ${formatCurrency(day.total_revenue)}`}
            />
          );
        })}
      </div>
      <InlineStack align="space-between">
        <Text variant="bodySm" tone="subdued">{data[0]?.date}</Text>
        <Text variant="bodySm" tone="subdued">{data[data.length - 1]?.date}</Text>
      </InlineStack>
    </Box>
  );
}

/**
 * Main Sales Insights Content Component
 */
export default function SalesInsightsContent() {
  const [period, setPeriod] = useState('last30days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  
  const { getReport } = useInsightsFetch();

  // Fetch report when period changes
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getReport({ period, compare: true });
      setReport(data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
      setError(err.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [getReport, period]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Handle period change
  const handlePeriodChange = useCallback((value) => {
    setPeriod(value);
  }, []);

  // Render loading state
  if (loading) {
    return (
      <Box padding="800">
        <BlockStack align="center" gap="400">
          <Spinner size="large" />
          <Text tone="subdued">Loading insights...</Text>
        </BlockStack>
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box padding="400">
        <Banner
          title="Failed to load insights"
          tone="critical"
          action={{ content: 'Retry', onAction: fetchReport }}
        >
          <p>{error}</p>
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
            Make sure webhooks are configured and data has been collected.
          </p>
        </Banner>
      </Box>
    );
  }

  const { metrics, comparison_metrics, insights, top_products, trends, daily_data, summary } = report || {};

  return (
    <BlockStack gap="400">
      {/* Period Selector */}
      <InlineStack align="space-between">
        <Text variant="headingMd" as="h2">Sales & Growth Insights</Text>
        <div style={{ width: '200px' }}>
          <Select
            label="Period"
            labelHidden
            options={PERIOD_OPTIONS}
            value={period}
            onChange={handlePeriodChange}
          />
        </div>
      </InlineStack>

      {/* Summary Banner */}
      {summary && (
        <Banner tone="info">
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
            {summary}
          </pre>
        </Banner>
      )}

      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <MetricCard
          title="Total Revenue"
          value={metrics?.revenue || 0}
          comparison={comparison_metrics?.revenue}
          trend={trends?.revenue_trend}
        />
        <MetricCard
          title="Total Orders"
          value={metrics?.orders || 0}
          comparison={comparison_metrics?.orders}
          trend={trends?.orders_trend}
          format="number"
        />
        <MetricCard
          title="Avg Order Value"
          value={metrics?.aov || 0}
          comparison={comparison_metrics?.aov}
          trend={trends?.aov_trend}
        />
        <MetricCard
          title="Items Sold"
          value={metrics?.itemsSold || 0}
          comparison={comparison_metrics?.itemsSold}
          format="number"
        />
      </div>

      {/* Daily Revenue Chart */}
      <Card>
        <BlockStack gap="300">
          <Text variant="headingMd" as="h3">Daily Revenue</Text>
          <DailyChart data={daily_data} />
        </BlockStack>
      </Card>

      {/* Two Column Layout: Insights & Products */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Insights Column */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h3">
              Key Insights
              {insights?.length > 0 && (
                <Badge tone="info" size="small">{insights.length}</Badge>
              )}
            </Text>
            
            {(!insights || insights.length === 0) ? (
              <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="200" align="center">
                  <Text tone="subdued">No significant insights for this period</Text>
                  <Text variant="bodySm" tone="subdued">
                    Insights are generated when comparing metrics across periods.
                    Try selecting a longer time range or wait for more data.
                  </Text>
                </BlockStack>
              </Box>
            ) : (
              <BlockStack gap="200">
                {insights.slice(0, 5).map((insight, idx) => (
                  <InsightItem key={idx} insight={insight} />
                ))}
              </BlockStack>
            )}
          </BlockStack>
        </Card>

        {/* Top Products Column */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd" as="h3">Top Products</Text>
            
            {(!top_products || top_products.length === 0) ? (
              <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <Text tone="subdued" alignment="center">
                  No product data available for this period
                </Text>
              </Box>
            ) : (
              <BlockStack gap="100">
                {top_products.slice(0, 5).map((product, idx) => (
                  <ProductItem 
                    key={idx} 
                    product={product} 
                    maxRevenue={top_products[0]?.revenue || 1}
                  />
                ))}
              </BlockStack>
            )}
          </BlockStack>
        </Card>
      </div>

      {/* Additional Metrics */}
      <Card>
        <BlockStack gap="300">
          <Text variant="headingMd" as="h3">Additional Metrics</Text>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <Box padding="300" background="bg-surface-secondary" borderRadius="200">
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">New Customer Orders</Text>
                <Text variant="headingMd">{metrics?.newCustomerOrders || 0}</Text>
              </BlockStack>
            </Box>
            <Box padding="300" background="bg-surface-secondary" borderRadius="200">
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Returning Customer Orders</Text>
                <Text variant="headingMd">{metrics?.returningCustomerOrders || 0}</Text>
              </BlockStack>
            </Box>
            <Box padding="300" background="bg-surface-secondary" borderRadius="200">
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Orders with Discount</Text>
                <Text variant="headingMd">{metrics?.ordersWithDiscount || 0}</Text>
              </BlockStack>
            </Box>
            <Box padding="300" background="bg-surface-secondary" borderRadius="200">
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Total Discounts</Text>
                <Text variant="headingMd">{formatCurrency(metrics?.discountTotal || 0)}</Text>
              </BlockStack>
            </Box>
            <Box padding="300" background="bg-surface-secondary" borderRadius="200">
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Refunds</Text>
                <Text variant="headingMd" tone={metrics?.refundTotal > 0 ? 'critical' : undefined}>
                  {formatCurrency(metrics?.refundTotal || 0)}
                </Text>
              </BlockStack>
            </Box>
            <Box padding="300" background="bg-surface-secondary" borderRadius="200">
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Cancelled Orders</Text>
                <Text variant="headingMd" tone={metrics?.cancelledOrders > 0 ? 'warning' : undefined}>
                  {metrics?.cancelledOrders || 0}
                </Text>
              </BlockStack>
            </Box>
          </div>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}

