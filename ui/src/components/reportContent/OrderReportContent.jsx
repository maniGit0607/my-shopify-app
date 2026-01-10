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
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area,
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

export default function OrdersReportContent() {
  const { getSalesRevenue, getRefundsCancellations, getOrderStatus, getOrderTrends } = useInsightsFetch();
  const [selectedReport, setSelectedReport] = useState('salesRevenue');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);

  const today = new Date();
  const [dateRange, setDateRange] = useState({
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30),
    end: today,
  });

  const reportOptions = [
    { label: '📊 Sales & Revenue', value: 'salesRevenue' },
    { label: '💸 Refunds & Cancellations', value: 'refundsCancellations' },
    { label: '📋 Order Status Breakdown', value: 'orderStatus' },
    { label: '📈 Time-based Trends', value: 'orderTrends' },
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
        case 'salesRevenue':
          data = await getSalesRevenue({ startDate, endDate });
          break;
        case 'refundsCancellations':
          data = await getRefundsCancellations({ startDate, endDate });
          break;
        case 'orderStatus':
          data = await getOrderStatus({ startDate, endDate });
          break;
        case 'orderTrends':
          data = await getOrderTrends({ startDate, endDate });
          break;
        default:
          data = await getSalesRevenue({ startDate, endDate });
      }

      setReportData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch report data');
      console.error('Error fetching order report:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedReport, getSalesRevenue, getRefundsCancellations, getOrderStatus, getOrderTrends]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #e1e3e5',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <Text variant="bodyMd" fontWeight="semibold">{label}</Text>
          {payload.map((p, i) => (
            <div key={i} style={{ marginTop: '4px' }}>
              <Text variant="bodySm" tone="subdued">
                {p.name}: {typeof p.value === 'number' && p.dataKey?.includes('revenue') 
                  ? formatCurrency(p.value) 
                  : p.value}
              </Text>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render Sales & Revenue Report
  const renderSalesRevenueReport = () => {
    if (!reportData) return null;

    const { grossSales, netSales, averageOrderValue, ordersCount, revenueGrowth, dailyBreakdown, itemsSold } = reportData;

    return (
      <BlockStack gap="400">
        {/* Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Gross Sales</Text>
              <Text variant="headingLg">{formatCurrency(grossSales)}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Net Sales</Text>
              <Text variant="headingLg">{formatCurrency(netSales)}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Orders</Text>
              <Text variant="headingLg">{ordersCount.toLocaleString()}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Average Order Value</Text>
              <Text variant="headingLg">{formatCurrency(averageOrderValue)}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Items Sold</Text>
              <Text variant="headingLg">{itemsSold?.toLocaleString() || 0}</Text>
            </BlockStack>
          </Card>
        </div>

        {/* Growth Metrics */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd">Revenue Growth</Text>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued">Week over Week</Text>
                  <Text variant="headingMd" tone={revenueGrowth?.weekOverWeek >= 0 ? 'success' : 'critical'}>
                    {formatPercent(revenueGrowth?.weekOverWeek || 0)}
                  </Text>
                </BlockStack>
              </Box>
              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued">Month over Month</Text>
                  <Text variant="headingMd" tone={revenueGrowth?.monthOverMonth >= 0 ? 'success' : 'critical'}>
                    {formatPercent(revenueGrowth?.monthOverMonth || 0)}
                  </Text>
                </BlockStack>
              </Box>
              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="100">
                  <Text variant="bodySm" tone="subdued">Year over Year</Text>
                  <Text variant="headingMd" tone={revenueGrowth?.yearOverYear >= 0 ? 'success' : 'critical'}>
                    {formatPercent(revenueGrowth?.yearOverYear || 0)}
                  </Text>
                </BlockStack>
              </Box>
            </div>
          </BlockStack>
        </Card>

        {/* Daily Chart */}
        {dailyBreakdown && dailyBreakdown.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Daily Revenue Trend</Text>
              <div style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="netSales" name="Net Sales" stroke="#008060" fill="#008060" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="grossSales" name="Gross Sales" stroke="#5C6AC4" fill="#5C6AC4" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    );
  };

  // Render Refunds & Cancellations Report
  const renderRefundsCancellationsReport = () => {
    if (!reportData) return null;

    const { totalRefundedAmount, refundRate, refundCount, cancelledOrdersCount, cancelledRevenue, cancellationRate, dailyTrend, refundsByReason, cancellationsByReason } = reportData;

    return (
      <BlockStack gap="400">
        {/* Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Total Refunded</Text>
              <Text variant="headingLg" tone="critical">{formatCurrency(totalRefundedAmount)}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Refund Rate</Text>
              <Text variant="headingLg">{refundRate?.toFixed(1) || 0}%</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Refund Count</Text>
              <Text variant="headingLg">{refundCount}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Cancelled Orders</Text>
              <Text variant="headingLg">{cancelledOrdersCount}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Cancelled Revenue</Text>
              <Text variant="headingLg" tone="critical">{formatCurrency(cancelledRevenue)}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Cancellation Rate</Text>
              <Text variant="headingLg">{cancellationRate?.toFixed(1) || 0}%</Text>
            </BlockStack>
          </Card>
        </div>

        {/* Daily Trend */}
        {dailyTrend && dailyTrend.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Refunds & Cancellations Trend</Text>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="refundAmount" name="Refunds" stroke="#DC5E63" strokeWidth={2} />
                    <Line type="monotone" dataKey="cancelledAmount" name="Cancellations" stroke="#FFC96B" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </BlockStack>
          </Card>
        )}

        {/* Breakdown by Reason */}
        <InlineStack gap="400" wrap={false}>
          {refundsByReason && refundsByReason.length > 0 && (
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd">Refunds by Reason</Text>
                {refundsByReason.map((item, i) => (
                  <Box key={i} padding="200" background="bg-surface-secondary" borderRadius="100">
                    <InlineStack align="space-between">
                      <Text variant="bodySm">{item.reason || 'Unspecified'}</Text>
                      <Text variant="bodySm" fontWeight="medium">{item.count} ({formatCurrency(item.amount)})</Text>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            </Card>
          )}
          {cancellationsByReason && cancellationsByReason.length > 0 && (
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd">Cancellations by Reason</Text>
                {cancellationsByReason.map((item, i) => (
                  <Box key={i} padding="200" background="bg-surface-secondary" borderRadius="100">
                    <InlineStack align="space-between">
                      <Text variant="bodySm">{item.reason || 'Unspecified'}</Text>
                      <Text variant="bodySm" fontWeight="medium">{item.count} ({formatCurrency(item.amount)})</Text>
                    </InlineStack>
                  </Box>
                ))}
              </BlockStack>
            </Card>
          )}
        </InlineStack>
      </BlockStack>
    );
  };

  // Render Order Status Report
  const renderOrderStatusReport = () => {
    if (!reportData) return null;

    const { totalOrders, totalRevenue, financialBreakdown, fulfillmentBreakdown } = reportData;

    const financialData = financialBreakdown?.map(item => ({
      name: item.status,
      value: item.count,
      revenue: item.revenue,
      percentage: item.percentage,
    })) || [];

    const fulfillmentData = fulfillmentBreakdown?.map(item => ({
      name: item.status,
      value: item.count,
      revenue: item.revenue,
      percentage: item.percentage,
    })) || [];

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
        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Total Orders</Text>
              <Text variant="headingLg">{totalOrders?.toLocaleString() || 0}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Total Revenue</Text>
              <Text variant="headingLg">{formatCurrency(totalRevenue || 0)}</Text>
            </BlockStack>
          </Card>
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {/* Financial Status */}
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Financial Status</Text>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={financialData} cx="50%" cy="50%" labelLine={false} label={renderCustomLabel} outerRadius={100} fill="#8884d8" dataKey="value">
                      {financialData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <BlockStack gap="100">
                {financialData.map((item, i) => (
                  <InlineStack key={i} align="space-between">
                    <Text variant="bodySm">{item.name}</Text>
                    <Text variant="bodySm">{item.value} orders ({formatCurrency(item.revenue)})</Text>
                  </InlineStack>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>

          {/* Fulfillment Status */}
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Fulfillment Status</Text>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fulfillmentData} cx="50%" cy="50%" labelLine={false} label={renderCustomLabel} outerRadius={100} fill="#8884d8" dataKey="value">
                      {fulfillmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <BlockStack gap="100">
                {fulfillmentData.map((item, i) => (
                  <InlineStack key={i} align="space-between">
                    <Text variant="bodySm">{item.name}</Text>
                    <Text variant="bodySm">{item.value} orders ({formatCurrency(item.revenue)})</Text>
                  </InlineStack>
                ))}
              </BlockStack>
            </BlockStack>
          </Card>
        </div>
      </BlockStack>
    );
  };

  // Render Order Trends Report
  const renderOrderTrendsReport = () => {
    if (!reportData) return null;

    const { dailyTrends, hourlyHeatmap, weekdayVsWeekend, dayOfWeekPerformance, peakHour, peakHourLabel, peakDay } = reportData;

    return (
      <BlockStack gap="400">
        {/* Peak Insights */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Peak Hour</Text>
              <Text variant="headingLg">{peakHourLabel || 'N/A'}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Best Day</Text>
              <Text variant="headingLg">{peakDay || 'N/A'}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Weekday Avg Orders</Text>
              <Text variant="headingLg">{weekdayVsWeekend?.weekday?.avgOrders?.toFixed(1) || 0}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Weekend Avg Orders</Text>
              <Text variant="headingLg">{weekdayVsWeekend?.weekend?.avgOrders?.toFixed(1) || 0}</Text>
            </BlockStack>
          </Card>
        </div>

        {/* Daily Trends Chart */}
        {dailyTrends && dailyTrends.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Orders by Day</Text>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="orderCount" name="Orders" fill="#008060" radius={[4, 4, 0, 0]}>
                      {dailyTrends.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isWeekend ? '#5C6AC4' : '#008060'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <InlineStack gap="400">
                <InlineStack gap="100">
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#008060', borderRadius: '2px' }} />
                  <Text variant="bodySm">Weekday</Text>
                </InlineStack>
                <InlineStack gap="100">
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#5C6AC4', borderRadius: '2px' }} />
                  <Text variant="bodySm">Weekend</Text>
                </InlineStack>
              </InlineStack>
            </BlockStack>
          </Card>
        )}

        {/* Hourly Heatmap */}
        {hourlyHeatmap && hourlyHeatmap.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Orders by Hour of Day</Text>
              <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyHeatmap}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hourLabel" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="orderCount" name="Orders" fill="#006FBB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </BlockStack>
          </Card>
        )}

        {/* Day of Week Performance */}
        {dayOfWeekPerformance && dayOfWeekPerformance.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Performance by Day of Week</Text>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {dayOfWeekPerformance.map((day, i) => (
                  <Box key={i} padding="200" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="100" align="center">
                      <Text variant="bodySm" fontWeight="medium">{day.day?.substring(0, 3)}</Text>
                      <Text variant="headingMd">{day.avgOrders?.toFixed(1) || 0}</Text>
                      <Text variant="bodySm" tone="subdued">avg orders</Text>
                    </BlockStack>
                  </Box>
                ))}
              </div>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    );
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <Box padding="800">
          <BlockStack align="center" gap="400">
            <Spinner size="large" />
            <Text tone="subdued">Loading report data...</Text>
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

    if (!reportData) {
      return (
        <Card>
          <Box padding="800">
            <BlockStack align="center" gap="200">
              <Text variant="headingMd">No data available</Text>
              <Text tone="subdued">Run reconciliation or wait for orders to be processed.</Text>
            </BlockStack>
          </Box>
        </Card>
      );
    }

    switch (selectedReport) {
      case 'salesRevenue':
        return renderSalesRevenueReport();
      case 'refundsCancellations':
        return renderRefundsCancellationsReport();
      case 'orderStatus':
        return renderOrderStatusReport();
      case 'orderTrends':
        return renderOrderTrendsReport();
      default:
        return renderSalesRevenueReport();
    }
  };

  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="end">
        <Select
          label="Select Order Report"
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
