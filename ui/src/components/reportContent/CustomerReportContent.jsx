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
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
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

export default function CustomerReportContent() {
  const { getCustomerGrowth, getCustomerRepeat, getCustomerValue, getCustomerGeography } = useInsightsFetch();
  const [selectedReport, setSelectedReport] = useState('customerGrowth');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);

  const today = new Date();
  const [dateRange, setDateRange] = useState({
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30),
    end: today,
  });

  const reportOptions = [
    { label: '📈 Customer Growth', value: 'customerGrowth' },
    { label: '🔄 Repeat vs New Customers', value: 'repeatVsNew' },
    { label: '💎 Customer Lifetime Value', value: 'customerValue' },
    { label: '🌍 Customer Geography', value: 'customerGeography' },
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
        case 'customerGrowth':
          data = await getCustomerGrowth({ startDate, endDate });
          break;
        case 'repeatVsNew':
          data = await getCustomerRepeat({ startDate, endDate });
          break;
        case 'customerValue':
          data = await getCustomerValue({ limit: 25 });
          break;
        case 'customerGeography':
          data = await getCustomerGeography();
          break;
        default:
          data = await getCustomerGrowth({ startDate, endDate });
      }

      setReportData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch report data');
      console.error('Error fetching customer report:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedReport, getCustomerGrowth, getCustomerRepeat, getCustomerValue, getCustomerGeography]);

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
                {p.name}: {p.value}
              </Text>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render Customer Growth Report
  const renderCustomerGrowthReport = () => {
    if (!reportData) return null;

    const { 
      totalNewCustomers, 
      totalReturningCustomers, 
      previousNewCustomers,
      growthRate, 
      newCustomersPerDay,
      averageNewPerDay 
    } = reportData;

    return (
      <BlockStack gap="400">
        {/* Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">New Customers</Text>
              <Text variant="headingLg">{totalNewCustomers || 0}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Returning Customers</Text>
              <Text variant="headingLg">{totalReturningCustomers || 0}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Previous Period New</Text>
              <Text variant="headingLg">{previousNewCustomers || 0}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Growth Rate</Text>
              <Text variant="headingLg" tone={growthRate >= 0 ? 'success' : 'critical'}>
                {formatPercent(growthRate || 0)}
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Avg New/Day</Text>
              <Text variant="headingLg">{(averageNewPerDay || 0).toFixed(1)}</Text>
            </BlockStack>
          </Card>
        </div>

        {/* Daily Trend Chart */}
        {newCustomersPerDay && newCustomersPerDay.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Daily Customer Acquisition</Text>
              <div style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={newCustomersPerDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="newCustomers" name="New Customers" stroke="#008060" fill="#008060" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="returningCustomers" name="Returning Customers" stroke="#5C6AC4" fill="#5C6AC4" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    );
  };

  // Render Repeat vs New Report
  const renderRepeatVsNewReport = () => {
    if (!reportData) return null;

    const { 
      firstTimeBuyers, 
      repeatBuyers, 
      totalOrders,
      ordersPerCustomer,
      repeatPurchaseRate,
      revenueSplit,
      customerBase,
      dailyBreakdown 
    } = reportData;

    const pieData = [
      { name: 'First-time Buyers', value: firstTimeBuyers || 0 },
      { name: 'Repeat Buyers', value: repeatBuyers || 0 },
    ].filter(d => d.value > 0);

    const customerPieData = [
      { name: 'One-time Customers', value: customerBase?.oneTimeCustomers || 0 },
      { name: 'Repeat Customers', value: customerBase?.repeatCustomers || 0 },
    ].filter(d => d.value > 0);

    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
      if (percent < 0.05) return null;
      const RADIAN = Math.PI / 180;
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{ fontWeight: 'bold', fontSize: '12px' }}>
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      );
    };

    return (
      <BlockStack gap="400">
        {/* Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">First-time Orders</Text>
              <Text variant="headingLg">{firstTimeBuyers || 0}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Repeat Orders</Text>
              <Text variant="headingLg">{repeatBuyers || 0}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Total Orders</Text>
              <Text variant="headingLg">{totalOrders || 0}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Repeat Purchase Rate</Text>
              <Text variant="headingLg">{(repeatPurchaseRate || 0).toFixed(1)}%</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Avg Orders/Customer</Text>
              <Text variant="headingLg">{(ordersPerCustomer || 0).toFixed(1)}</Text>
            </BlockStack>
          </Card>
        </div>

        {/* Pie Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Orders by Customer Type</Text>
              {pieData.length > 0 ? (
                <div style={{ height: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={renderCustomLabel} outerRadius={100} fill="#8884d8" dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Box padding="400">
                  <Text tone="subdued">No data available</Text>
                </Box>
              )}
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Customer Base</Text>
              {customerPieData.length > 0 ? (
                <div style={{ height: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={customerPieData} cx="50%" cy="50%" labelLine={false} label={renderCustomLabel} outerRadius={100} fill="#8884d8" dataKey="value">
                        {customerPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Box padding="400">
                  <Text tone="subdued">No data available</Text>
                </Box>
              )}
            </BlockStack>
          </Card>
        </div>

        {/* Daily Trend */}
        {dailyBreakdown && dailyBreakdown.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Daily Breakdown</Text>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="newCustomerOrders" name="New Customer Orders" fill="#008060" stackId="a" />
                    <Bar dataKey="returningCustomerOrders" name="Returning Customer Orders" fill="#5C6AC4" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    );
  };

  // Render Customer Value Report
  const renderCustomerValueReport = () => {
    if (!reportData) return null;

    const { 
      lifetimeValue, 
      averageSpendPerCustomer,
      averageOrdersPerCustomer,
      topCustomersBySpend, 
      topCustomersByOrders,
      oneTimeVsLoyal,
      repeatPurchaseRate,
      totalCustomers 
    } = reportData;

    const loyaltyPieData = [
      { name: 'One-time', value: oneTimeVsLoyal?.oneTime?.count || 0 },
      { name: 'Loyal (2+ orders)', value: oneTimeVsLoyal?.loyal?.count || 0 },
    ].filter(d => d.value > 0);

    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
      if (percent < 0.05) return null;
      const RADIAN = Math.PI / 180;
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{ fontWeight: 'bold', fontSize: '12px' }}>
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      );
    };

    return (
      <BlockStack gap="400">
        {/* Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Avg Lifetime Value</Text>
              <Text variant="headingLg">{formatCurrency(lifetimeValue?.average || 0)}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Total LTV Revenue</Text>
              <Text variant="headingLg">{formatCurrency(lifetimeValue?.total || 0)}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Avg Spend/Customer</Text>
              <Text variant="headingLg">{formatCurrency(averageSpendPerCustomer || 0)}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Avg Orders/Customer</Text>
              <Text variant="headingLg">{(averageOrdersPerCustomer || 0).toFixed(1)}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Repeat Purchase Rate</Text>
              <Text variant="headingLg">{(repeatPurchaseRate || 0).toFixed(1)}%</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Total Customers</Text>
              <Text variant="headingLg">{totalCustomers || 0}</Text>
            </BlockStack>
          </Card>
        </div>

        {/* Loyalty Distribution */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd">Customer Loyalty Distribution</Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {loyaltyPieData.length > 0 && (
                <div style={{ height: '250px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={loyaltyPieData} cx="50%" cy="50%" labelLine={false} label={renderCustomLabel} outerRadius={90} fill="#8884d8" dataKey="value">
                        {loyaltyPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <BlockStack gap="200">
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">One-time Customers</Text>
                    <Text variant="headingMd">{oneTimeVsLoyal?.oneTime?.count || 0}</Text>
                    <Text variant="bodySm" tone="subdued">{(oneTimeVsLoyal?.oneTime?.percentage || 0).toFixed(1)}% of total</Text>
                  </BlockStack>
                </Box>
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">Loyal Customers (2+ orders)</Text>
                    <Text variant="headingMd">{oneTimeVsLoyal?.loyal?.count || 0}</Text>
                    <Text variant="bodySm" tone="subdued">{(oneTimeVsLoyal?.loyal?.percentage || 0).toFixed(1)}% of total</Text>
                  </BlockStack>
                </Box>
              </BlockStack>
            </div>
          </BlockStack>
        </Card>

        {/* Top Customers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">🏆 Top Customers by Spend</Text>
              {topCustomersBySpend && topCustomersBySpend.length > 0 ? (
                <BlockStack gap="200">
                  {topCustomersBySpend.slice(0, 10).map((customer, index) => (
                    <Box key={index} padding="200" background="bg-surface-secondary" borderRadius="100">
                      <InlineStack align="space-between">
                        <BlockStack gap="050">
                          <Text variant="bodySm" fontWeight="medium">
                            {customer.email || `Customer #${customer.customerId}`}
                          </Text>
                          <Text variant="bodySm" tone="subdued">{customer.totalOrders} orders</Text>
                        </BlockStack>
                        <BlockStack align="end">
                          <Text variant="bodyMd" fontWeight="medium">{formatCurrency(customer.totalSpent)}</Text>
                          {customer.isRepeatCustomer && <Badge tone="success" size="small">Repeat</Badge>}
                        </BlockStack>
                      </InlineStack>
                    </Box>
                  ))}
                </BlockStack>
              ) : (
                <Text tone="subdued">No customer data available</Text>
              )}
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">🔄 Top Customers by Orders</Text>
              {topCustomersByOrders && topCustomersByOrders.length > 0 ? (
                <BlockStack gap="200">
                  {topCustomersByOrders.slice(0, 10).map((customer, index) => (
                    <Box key={index} padding="200" background="bg-surface-secondary" borderRadius="100">
                      <InlineStack align="space-between">
                        <BlockStack gap="050">
                          <Text variant="bodySm" fontWeight="medium">
                            {customer.email || `Customer #${customer.customerId}`}
                          </Text>
                          <Text variant="bodySm" tone="subdued">{formatCurrency(customer.totalSpent)} total</Text>
                        </BlockStack>
                        <BlockStack align="end">
                          <Text variant="bodyMd" fontWeight="medium">{customer.totalOrders} orders</Text>
                          <Text variant="bodySm" tone="subdued">AOV: {formatCurrency(customer.averageOrderValue)}</Text>
                        </BlockStack>
                      </InlineStack>
                    </Box>
                  ))}
                </BlockStack>
              ) : (
                <Text tone="subdued">No customer data available</Text>
              )}
            </BlockStack>
          </Card>
        </div>
      </BlockStack>
    );
  };

  // Render Customer Geography Report
  const renderCustomerGeographyReport = () => {
    if (!reportData) return null;

    const { data, totalCustomers, totalSpent, totalOrders, topCountries } = reportData;

    const pieData = (topCountries || data || []).slice(0, 10).map(item => ({
      name: item.name,
      value: item.value,
      percentage: item.percentage,
      totalSpent: item.totalSpent,
      totalOrders: item.totalOrders,
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
        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Total Customers</Text>
              <Text variant="headingLg">{totalCustomers || 0}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Total Spent</Text>
              <Text variant="headingLg">{formatCurrency(totalSpent || 0)}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="100">
              <Text variant="bodySm" tone="subdued">Total Orders</Text>
              <Text variant="headingLg">{totalOrders || 0}</Text>
            </BlockStack>
          </Card>
        </div>

        {/* Pie Chart */}
        {pieData.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd">Customers by Country</Text>
              <div style={{ height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={140}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [
                        `${value} customers (${props.payload.percentage}%)`,
                        props.payload.name
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </BlockStack>
          </Card>
        )}

        {/* Country Details */}
        <Card>
          <BlockStack gap="300">
            <Text variant="headingMd">Country Breakdown</Text>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {(data || []).slice(0, 12).map((country, index) => (
                <Box key={index} padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="100">
                    <InlineStack align="space-between">
                      <Text variant="bodyMd" fontWeight="medium">{country.name}</Text>
                      <Badge>{country.percentage}%</Badge>
                    </InlineStack>
                    <Text variant="headingMd">{country.value} customers</Text>
                    <InlineStack gap="200">
                      <Text variant="bodySm" tone="subdued">{country.totalOrders || 0} orders</Text>
                      <Text variant="bodySm" tone="subdued">{formatCurrency(country.totalSpent || 0)} spent</Text>
                    </InlineStack>
                    {country.avgSpentPerCustomer !== undefined && (
                      <Text variant="bodySm" tone="subdued">
                        Avg: {formatCurrency(country.avgSpentPerCustomer)}/customer
                      </Text>
                    )}
                  </BlockStack>
                </Box>
              ))}
            </div>
            {(data || []).length > 12 && (
              <Text variant="bodySm" tone="subdued">
                +{(data || []).length - 12} more countries
              </Text>
            )}
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
            <Text tone="subdued">Loading customer data...</Text>
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
      case 'customerGrowth':
        return renderCustomerGrowthReport();
      case 'repeatVsNew':
        return renderRepeatVsNewReport();
      case 'customerValue':
        return renderCustomerValueReport();
      case 'customerGeography':
        return renderCustomerGeographyReport();
      default:
        return renderCustomerGrowthReport();
    }
  };

  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="end">
        <Select
          label="Select Customer Report"
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
