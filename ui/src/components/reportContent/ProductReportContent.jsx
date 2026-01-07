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
} from '@shopify/polaris';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import DateRangePicker from '../util/date/DateRangePicker';
import { useInsightsFetch } from '../../hooks/useInsightsFetch';

const COLORS = ['#008060', '#5C6AC4', '#006FBB', '#47C1BF', '#FFC96B', '#DC5E63', '#7B6BD6', '#9C6ADE', '#47C1BF', '#F49342'];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductReportContent() {
  const { getProducts } = useInsightsFetch();
  const [selectedReport, setSelectedReport] = useState('topByRevenue');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [topCount, setTopCount] = useState(10);
  
  const today = new Date();
  const [dateRange, setDateRange] = useState({
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30),
    end: today,
  });

  const reportOptions = [
    { label: 'Top Products by Revenue', value: 'topByRevenue' },
    { label: 'Top Products by Units Sold', value: 'topByUnits' },
    { label: 'Product Revenue Share', value: 'productRevenueShare' },
  ];

  const handleReportChange = (value) => {
    setSelectedReport(value);
  };

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  // Fetch product data
  const fetchProductData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const startDate = new Date(dateRange.start).toISOString().split('T')[0];
      const endDate = new Date(dateRange.end).toISOString().split('T')[0];
      
      const data = await getProducts({ 
        startDate, 
        endDate, 
        limit: topCount 
      });
      
      setProducts(data.products || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch product data');
      console.error('Error fetching product report:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, topCount, getProducts]);

  useEffect(() => {
    fetchProductData();
  }, [fetchProductData]);

  // Prepare chart data based on report type
  const getChartData = () => {
    if (!products || products.length === 0) return [];
    
    return products.slice(0, topCount).map(product => ({
      name: product.productTitle?.length > 20 
        ? product.productTitle.substring(0, 20) + '...' 
        : product.productTitle || 'Unknown',
      fullName: product.productTitle || 'Unknown',
      revenue: product.revenue || 0,
      unitsSold: product.unitsSold || 0,
    }));
  };

  const chartData = getChartData();
  const maxValue = selectedReport === 'topByRevenue'
    ? Math.max(...chartData.map(d => d.revenue), 1)
    : Math.max(...chartData.map(d => d.unitsSold), 1);
  
  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
  const totalUnits = chartData.reduce((sum, item) => sum + item.unitsSold, 0);

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
          <Text variant="bodyMd" fontWeight="semibold">{data.fullName}</Text>
          <div style={{ marginTop: '8px' }}>
            <Text variant="bodySm">Revenue: {formatCurrency(data.revenue)}</Text>
          </div>
          <div>
            <Text variant="bodySm">Units Sold: {data.unitsSold}</Text>
          </div>
          {data.percentage !== undefined && (
            <div>
              <Text variant="bodySm">Share: {data.percentage.toFixed(1)}%</Text>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        style={{ fontWeight: 'bold', fontSize: '11px' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Add percentage to chart data for pie chart
  const chartDataWithPercentage = chartData.map(item => ({
    ...item,
    percentage: totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0,
  }));

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

      {loading && (
        <Box padding="800">
          <BlockStack align="center" gap="400">
            <Spinner size="large" />
            <Text tone="subdued">Loading product data...</Text>
          </BlockStack>
        </Box>
      )}

      {error && (
        <Banner tone="critical" title="Error loading data">
          <p>{error}</p>
        </Banner>
      )}

      {!loading && !error && chartData.length === 0 && (
        <Card>
          <Box padding="800">
            <BlockStack align="center" gap="200">
              <Text variant="headingMd">No product data available</Text>
              <Text tone="subdued">Run reconciliation or wait for orders to be processed.</Text>
            </BlockStack>
          </Box>
        </Card>
      )}

      {!loading && !error && chartData.length > 0 && (
        <BlockStack gap="400">
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <Card>
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Total Revenue (Top {chartData.length})</Text>
                <Text variant="headingLg">{formatCurrency(totalRevenue)}</Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="100">
                <Text variant="bodySm" tone="subdued">Total Units Sold (Top {chartData.length})</Text>
                <Text variant="headingLg">{totalUnits.toLocaleString()}</Text>
              </BlockStack>
            </Card>
          </div>

          {/* Pie Chart for Product Revenue Share */}
          {selectedReport === 'productRevenueShare' && (
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h3">Product Revenue Share</Text>
                <Text tone="subdued">Top {chartDataWithPercentage.length} products by revenue share</Text>
                
                <div style={{ height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartDataWithPercentage}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomLabel}
                        outerRadius={140}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {chartDataWithPercentage.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={(value, entry) => entry.payload.name} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  {chartDataWithPercentage.slice(0, 6).map((item, index) => (
                    <Box key={index} padding="300" background="bg-surface-secondary" borderRadius="200">
                      <BlockStack gap="100">
                        <Text variant="bodySm" tone="subdued">{item.fullName}</Text>
                        <Text variant="headingMd">{formatCurrency(item.revenue)}</Text>
                        <Text variant="bodySm" tone="subdued">
                          {item.percentage.toFixed(1)}% of total
                        </Text>
                      </BlockStack>
                    </Box>
                  ))}
                </div>
              </BlockStack>
            </Card>
          )}

          {/* Bar Chart for Top by Revenue/Units */}
          {selectedReport !== 'productRevenueShare' && (
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h3">
                  {selectedReport === 'topByRevenue' ? 'Top Products by Revenue' : 'Top Products by Units Sold'}
                </Text>
                
                <div style={{ height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis 
                        type="number" 
                        tickFormatter={selectedReport === 'topByRevenue' ? (v) => formatCurrency(v) : undefined}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={100}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey={selectedReport === 'topByRevenue' ? 'revenue' : 'unitsSold'} 
                        radius={[0, 4, 4, 0]}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </BlockStack>
            </Card>
          )}

          {/* Product List */}
          {selectedReport !== 'productRevenueShare' && (
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h3">Product Details</Text>
                <BlockStack gap="200">
                  {chartData.map((product, index) => (
                    <Box key={index} padding="300" background="bg-surface-secondary" borderRadius="200">
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                          <Text variant="bodyMd" fontWeight="medium">
                            {index + 1}. {product.fullName}
                          </Text>
                          <Text variant="bodyMd">
                            {selectedReport === 'topByRevenue' 
                              ? formatCurrency(product.revenue) 
                              : `${product.unitsSold} units`}
                          </Text>
                        </InlineStack>
                        <ProgressBar 
                          progress={selectedReport === 'topByRevenue'
                            ? (product.revenue / maxValue) * 100
                            : (product.unitsSold / maxValue) * 100
                          } 
                          size="small" 
                          tone="primary" 
                        />
                        <InlineStack align="space-between">
                          <Text variant="bodySm" tone="subdued">
                            Revenue: {formatCurrency(product.revenue)}
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            Units: {product.unitsSold}
                          </Text>
                        </InlineStack>
                      </BlockStack>
                    </Box>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          )}
        </BlockStack>
      )}
    </BlockStack>
  );
}
