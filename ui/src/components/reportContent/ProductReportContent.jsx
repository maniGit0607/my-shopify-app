import React, { useState, useEffect, useCallback } from 'react';
import {
  Select,
  InlineStack,
  BlockStack,
  Card,
  Text,
  Spinner,
  Banner,
  Box,
  ProgressBar,
  Badge,
} from '@shopify/polaris';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import DateRangePicker from '../util/date/DateRangePicker';
import { useInsightsFetch } from '../../hooks/useInsightsFetch';

const COLORS = ['#008060', '#5C6AC4', '#006FBB', '#47C1BF', '#FFC96B', '#DC5E63', '#9C6ADE', '#F49342', '#50B83C', '#DE3618'];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export default function ProductReportContent() {
  const { getTopProducts, getProductTrends, getProductLifecycle } = useInsightsFetch();
  const [selectedReport, setSelectedReport] = useState('topProducts');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);

  const today = new Date();
  const [dateRange, setDateRange] = useState({
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30),
    end: today,
  });

  const reportOptions = [
    { label: '🏆 Top Selling Products', value: 'topProducts' },
    { label: '📈 Product Performance Trends', value: 'productTrends' },
    { label: '🔄 Product Lifecycle', value: 'productLifecycle' },
    { label: '🥧 Product Revenue Share', value: 'revenueShare' },
  ];

  const handleReportChange = (value) => {
    setSelectedReport(value);
  };

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = new Date(dateRange.start).toISOString().split('T')[0];
      const endDate = new Date(dateRange.end).toISOString().split('T')[0];

      let data;
      switch (selectedReport) {
        case 'topProducts':
          data = await getTopProducts({ startDate, endDate, limit: 20 });
          break;
        case 'productTrends':
          data = await getProductTrends({ startDate, endDate, limit: 15 });
          break;
        case 'productLifecycle':
          data = await getProductLifecycle({ startDate, endDate });
          break;
        case 'revenueShare':
          data = await getTopProducts({ startDate, endDate, limit: 10 });
          break;
        default:
          data = await getTopProducts({ startDate, endDate });
      }

      setReportData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch report data');
      console.error('Error fetching product report:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedReport, getTopProducts, getProductTrends, getProductLifecycle]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #e1e3e5',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <Text variant="bodyMd" fontWeight="semibold">{data.productTitle || data.name}</Text>
          <div style={{ marginTop: '8px' }}>
            <Text variant="bodySm">Revenue: {formatCurrency(data.revenue || data.currentRevenue || 0)}</Text>
          </div>
          <div>
            <Text variant="bodySm">Units Sold: {data.unitsSold || data.currentUnits || 0}</Text>
          </div>
          {data.revenueShare !== undefined && (
            <div>
              <Text variant="bodySm">Share: {data.revenueShare?.toFixed(1)}%</Text>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Render Top Products Report
  const renderTopProductsReport = () => {
    if (!reportData) return null;

    const { products, totalRevenue, totalUnits } = reportData;

    if (!products || products.length === 0) {
      return (
        <Card>
          <Box padding="800">
            <BlockStack align="center">
              <Text variant="headingMd">No product data available</Text>
              <Text tone="subdued">Run reconciliation to populate product data.</Text>
            </BlockStack>
          </Box>
        </Card>
      );
    }

    const chartData = products.slice(0, 10).map(p => ({
      name: p.productTitle?.length > 25 ? p.productTitle.substring(0, 25) + '...' : p.productTitle,
      productTitle: p.productTitle,
      revenue: p.revenue,
      unitsSold: p.unitsSold,
    }));

    const maxRevenue = Math.max(...products.map(p => p.revenue), 1);

    return (
      <BlockStack gap="400">
        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Total Revenue</Text>
              <Text variant="headingLg">{formatCurrency(totalRevenue)}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Total Units Sold</Text>
              <Text variant="headingLg">{totalUnits?.toLocaleString()}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Products in Period</Text>
              <Text variant="headingLg">{products.length}</Text>
            </BlockStack>
          </Card>
        </div>

        {/* Bar Chart */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd">Top 10 Products by Revenue</Text>
            <div style={{ height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </BlockStack>
        </Card>

        {/* Product List */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd">All Products</Text>
            <BlockStack gap="200">
              {products.map((product, index) => (
                <Box key={index} padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" fontWeight="medium">
                        {index + 1}. {product.productTitle}
                      </Text>
                      <Text variant="bodyMd">{formatCurrency(product.revenue)}</Text>
                    </InlineStack>
                    <ProgressBar progress={(product.revenue / maxRevenue) * 100} size="small" tone="primary" />
                    <InlineStack align="space-between">
                      <Text variant="bodySm" tone="subdued">
                        Units: {product.unitsSold} | Share: {product.revenueShare?.toFixed(1)}%
                      </Text>
                      {product.refundRate > 5 && (
                        <Badge tone="warning">Refund Rate: {product.refundRate?.toFixed(1)}%</Badge>
                      )}
                    </InlineStack>
                  </BlockStack>
                </Box>
              ))}
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    );
  };

  // Render Product Trends Report
  const renderProductTrendsReport = () => {
    if (!reportData) return null;

    const { bestPerformers, worstPerformers, newProducts, comparisonPeriod } = reportData;

    return (
      <BlockStack gap="400">
        <Text variant="bodySm" tone="subdued">
          Comparing to previous period: {comparisonPeriod?.start} - {comparisonPeriod?.end}
        </Text>

        {/* Best Performers */}
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text variant="headingMd">🚀 Best Performers</Text>
              <Badge tone="success">Growing</Badge>
            </InlineStack>
            {bestPerformers && bestPerformers.length > 0 ? (
              <BlockStack gap="200">
                {bestPerformers.slice(0, 10).map((product, index) => (
                  <Box key={index} padding="300" background="bg-surface-secondary" borderRadius="200">
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="medium">{product.productTitle}</Text>
                        <InlineStack gap="200">
                          <Text variant="bodySm" tone="subdued">
                            Current: {formatCurrency(product.currentRevenue)} ({product.currentUnits} units)
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            Previous: {formatCurrency(product.previousRevenue)}
                          </Text>
                        </InlineStack>
                      </BlockStack>
                      <BlockStack align="end">
                        <Text variant="headingMd" tone="success">{formatPercent(product.revenueChange)}</Text>
                        <Text variant="bodySm" tone="subdued">{product.salesVelocity?.toFixed(1)} units/day</Text>
                      </BlockStack>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            ) : (
              <Text tone="subdued">No growing products found</Text>
            )}
          </BlockStack>
        </Card>

        {/* Worst Performers */}
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text variant="headingMd">📉 Declining Products</Text>
              <Badge tone="critical">Declining</Badge>
            </InlineStack>
            {worstPerformers && worstPerformers.length > 0 ? (
              <BlockStack gap="200">
                {worstPerformers.slice(0, 10).map((product, index) => (
                  <Box key={index} padding="300" background="bg-surface-secondary" borderRadius="200">
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="medium">{product.productTitle}</Text>
                        <InlineStack gap="200">
                          <Text variant="bodySm" tone="subdued">
                            Current: {formatCurrency(product.currentRevenue)} ({product.currentUnits} units)
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            Previous: {formatCurrency(product.previousRevenue)}
                          </Text>
                        </InlineStack>
                      </BlockStack>
                      <Text variant="headingMd" tone="critical">{formatPercent(product.revenueChange)}</Text>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            ) : (
              <Text tone="subdued">No declining products found</Text>
            )}
          </BlockStack>
        </Card>

        {/* New Products */}
        {newProducts && newProducts.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text variant="headingMd">✨ New Products This Period</Text>
                <Badge tone="info">New</Badge>
              </InlineStack>
              <BlockStack gap="200">
                {newProducts.slice(0, 10).map((product, index) => (
                  <Box key={index} padding="300" background="bg-surface-secondary" borderRadius="200">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" fontWeight="medium">{product.productTitle}</Text>
                      <BlockStack align="end">
                        <Text variant="bodyMd">{formatCurrency(product.currentRevenue)}</Text>
                        <Text variant="bodySm" tone="subdued">{product.currentUnits} units</Text>
                      </BlockStack>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    );
  };

  // Render Product Lifecycle Report
  const renderProductLifecycleReport = () => {
    if (!reportData) return null;

    const { decliningProducts, highRefundProducts, neverSoldRecently, topPerformers, summary } = reportData;

    return (
      <BlockStack gap="400">
        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Total Products</Text>
              <Text variant="headingLg">{summary?.totalProducts || 0}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Active Products</Text>
              <Text variant="headingLg">{summary?.activeProducts || 0}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Declining</Text>
              <Text variant="headingLg" tone="warning">{summary?.decliningCount || 0}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">High Refund Rate</Text>
              <Text variant="headingLg" tone="critical">{summary?.highRefundCount || 0}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Inactive</Text>
              <Text variant="headingLg" tone="subdued">{summary?.inactiveCount || 0}</Text>
            </BlockStack>
          </Card>
        </div>

        {/* High Refund Products */}
        {highRefundProducts && highRefundProducts.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text variant="headingMd">⚠️ High Refund Rate Products</Text>
                <Badge tone="critical">Action Needed</Badge>
              </InlineStack>
              <Text variant="bodySm" tone="subdued">Products with refund rate above 10%</Text>
              <BlockStack gap="200">
                {highRefundProducts.map((product, index) => (
                  <Box key={index} padding="300" background="bg-surface-secondary" borderRadius="200">
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="medium">{product.productTitle}</Text>
                        <Text variant="bodySm" tone="subdued">
                          Sold: {product.unitsSold} | Refunded: {product.unitsRefunded}
                        </Text>
                      </BlockStack>
                      <BlockStack align="end">
                        <Badge tone="critical">{product.refundRate?.toFixed(1)}% refund rate</Badge>
                        <Text variant="bodySm" tone="subdued">Lost: {formatCurrency(product.refundAmount)}</Text>
                      </BlockStack>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        )}

        {/* Declining Products */}
        {decliningProducts && decliningProducts.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">📉 Declining Sales</Text>
              <Text variant="bodySm" tone="subdued">Products with significantly lower sales than previous period</Text>
              <BlockStack gap="200">
                {decliningProducts.slice(0, 10).map((product, index) => (
                  <Box key={index} padding="300" background="bg-surface-secondary" borderRadius="200">
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="medium">{product.productTitle}</Text>
                        <Text variant="bodySm" tone="subdued">
                          Previous: {formatCurrency(product.previousRevenue)} → Current: {formatCurrency(product.currentRevenue)}
                        </Text>
                      </BlockStack>
                      <Text variant="headingMd" tone="critical">{product.decline?.toFixed(0)}%</Text>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        )}

        {/* Inactive Products */}
        {neverSoldRecently && neverSoldRecently.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">💤 Products Not Sold Recently</Text>
              <Text variant="bodySm" tone="subdued">Products with no sales in the selected period</Text>
              <BlockStack gap="200">
                {neverSoldRecently.slice(0, 10).map((product, index) => (
                  <Box key={index} padding="300" background="bg-surface-secondary" borderRadius="200">
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="medium">{product.productTitle}</Text>
                        <Text variant="bodySm" tone="subdued">
                          Last sale: {product.lastSaleDate} | Total sold: {product.totalUnitsSold}
                        </Text>
                      </BlockStack>
                      <Badge>{product.daysSinceLastSale} days ago</Badge>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    );
  };

  // Render Revenue Share Report
  const renderRevenueShareReport = () => {
    if (!reportData) return null;

    const { products, totalRevenue } = reportData;

    if (!products || products.length === 0) {
      return (
        <Card>
          <Box padding="800">
            <BlockStack align="center">
              <Text variant="headingMd">No product data available</Text>
            </BlockStack>
          </Box>
        </Card>
      );
    }

    const pieData = products.slice(0, 10).map(p => ({
      name: p.productTitle?.length > 20 ? p.productTitle.substring(0, 20) + '...' : p.productTitle,
      value: p.revenue,
      productTitle: p.productTitle,
      revenueShare: p.revenueShare,
    }));

    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
      if (percent < 0.05) return null;
      const RADIAN = Math.PI / 180;
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{ fontWeight: 'bold', fontSize: '11px' }}>
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      );
    };

    return (
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd">Product Revenue Share</Text>
            <Text tone="subdued">Top 10 products contribution to total revenue</Text>
            <div style={{ height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={150}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </BlockStack>
        </Card>

        {/* Product breakdown */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd">Revenue Breakdown</Text>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {pieData.map((product, index) => (
                <Box key={index} padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="100">
                    <InlineStack gap="200" align="start">
                      <div style={{ width: '12px', height: '12px', backgroundColor: COLORS[index % COLORS.length], borderRadius: '2px', marginTop: '4px' }} />
                      <Text variant="bodySm" fontWeight="medium">{product.productTitle}</Text>
                    </InlineStack>
                    <Text variant="headingMd">{formatCurrency(product.value)}</Text>
                    <Text variant="bodySm" tone="subdued">{product.revenueShare?.toFixed(1)}% of total</Text>
                  </BlockStack>
                </Box>
              ))}
            </div>
          </BlockStack>
        </Card>
      </BlockStack>
    );
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <Box padding="800">
          <BlockStack align="center" gap="400">
            <Spinner size="large" />
            <Text tone="subdued">Loading product data...</Text>
          </BlockStack>
        </Box>
      );
    }

    if (error) {
      return (
        <Banner tone="critical" title="Error loading report">
          <p>{error}</p>
        </Banner>
      );
    }

    switch (selectedReport) {
      case 'topProducts':
        return renderTopProductsReport();
      case 'productTrends':
        return renderProductTrendsReport();
      case 'productLifecycle':
        return renderProductLifecycleReport();
      case 'revenueShare':
        return renderRevenueShareReport();
      default:
        return renderTopProductsReport();
    }
  };

  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="end">
        <Select
          label="Select Product Report"
          labelInline
          options={reportOptions}
          value={selectedReport}
          onChange={handleReportChange}
        />
        <DateRangePicker onChange={handleDateRangeChange} />
      </InlineStack>

      {renderReportContent()}
    </BlockStack>
  );
}
