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
} from '@shopify/polaris';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import DateRangePicker from '../util/date/DateRangePicker';
import { useInsightsFetch } from '../../hooks/useInsightsFetch';

const COLORS = ['#008060', '#5C6AC4', '#006FBB', '#47C1BF', '#FFC96B', '#DC5E63', '#9C6ADE', '#F49342', '#50B83C', '#DE3618'];

export default function CustomerReportContent() {
  const { getReport, getCustomerGeography } = useInsightsFetch();
  const [selectedReport, setSelectedReport] = useState('newVsReturning');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [geographyData, setGeographyData] = useState(null);
  
  const today = new Date();
  const [dateRange, setDateRange] = useState({
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30),
    end: today,
  });

  const reportOptions = [
    { label: 'New vs Returning Customers', value: 'newVsReturning' },
    { label: 'Customer Order Breakdown', value: 'customerOrders' },
    { label: 'Customers by Country', value: 'customersByCountry' },
  ];

  const handleReportChange = (value) => {
    setSelectedReport(value);
  };

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  // Fetch report data
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const startDate = new Date(dateRange.start).toISOString().split('T')[0];
      const endDate = new Date(dateRange.end).toISOString().split('T')[0];
      
      // Use the insights report which includes customer metrics
      const data = await getReport({ 
        startDate, 
        endDate, 
        compare: false 
      });
      
      setReportData(data);

      // Also fetch geography data (not date-dependent)
      if (selectedReport === 'customersByCountry' || !geographyData) {
        const geoData = await getCustomerGeography();
        setGeographyData(geoData);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch customer data');
      console.error('Error fetching customer report:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedReport, getReport, getCustomerGeography, geographyData]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Prepare chart data based on report type
  const getChartData = () => {
    if (selectedReport === 'customersByCountry') {
      if (!geographyData?.data?.length) return [];
      return geographyData.data.map(item => ({
        name: item.name,
        value: item.value,
        percentage: parseFloat(item.percentage),
        total_spent: item.total_spent,
        total_orders: item.total_orders,
      }));
    }

    if (!reportData?.metrics) return [];
    
    const { newCustomerOrders, returningCustomerOrders } = reportData.metrics;
    
    if (selectedReport === 'newVsReturning') {
      return [
        { name: 'New Customers', value: newCustomerOrders || 0 },
        { name: 'Returning Customers', value: returningCustomerOrders || 0 },
      ].filter(item => item.value > 0);
    }
    
    if (selectedReport === 'customerOrders') {
      return [
        { name: 'New Customer Orders', value: newCustomerOrders || 0 },
        { name: 'Returning Customer Orders', value: returningCustomerOrders || 0 },
      ];
    }
    
    return [];
  };

  const chartData = getChartData();
  const totalCustomers = chartData.reduce((sum, item) => sum + item.value, 0);

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
        style={{ fontWeight: 'bold', fontSize: '12px' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
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

      {loading && (
        <Box padding="800">
          <BlockStack align="center" gap="400">
            <Spinner size="large" />
            <Text tone="subdued">Loading customer data...</Text>
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
              <Text variant="headingMd">No customer data available</Text>
              <Text tone="subdued">Run reconciliation or wait for orders to be processed.</Text>
            </BlockStack>
          </Box>
        </Card>
      )}

      {!loading && !error && chartData.length > 0 && (
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h3">
              {selectedReport === 'newVsReturning' && 'New vs Returning Customers'}
              {selectedReport === 'customerOrders' && 'Customer Order Breakdown'}
              {selectedReport === 'customersByCountry' && 'Customers by Country'}
            </Text>
            
            <Text tone="subdued">
              Total: {totalCustomers} {selectedReport === 'customersByCountry' ? 'customers' : (selectedReport === 'newVsReturning' ? 'customers' : 'orders')}
            </Text>

            <div style={{ height: '400px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={140}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => {
                      if (selectedReport === 'customersByCountry') {
                        return [
                          `${value} customers (${props.payload.percentage}%)`,
                          props.payload.name
                        ];
                      }
                      return [value, 'Count'];
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              {chartData.slice(0, 6).map((item, index) => (
                <Box key={index} padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">{item.name}</Text>
                    <Text variant="headingLg">{item.value}</Text>
                    <Text variant="bodySm" tone="subdued">
                      {totalCustomers > 0 ? `${((item.value / totalCustomers) * 100).toFixed(1)}%` : '0%'}
                    </Text>
                    {selectedReport === 'customersByCountry' && item.total_orders > 0 && (
                      <Text variant="bodySm" tone="subdued">
                        {item.total_orders} orders
                      </Text>
                    )}
                  </BlockStack>
                </Box>
              ))}
            </div>
            {chartData.length > 6 && (
              <Text variant="bodySm" tone="subdued">
                +{chartData.length - 6} more countries
              </Text>
            )}
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  );
}
