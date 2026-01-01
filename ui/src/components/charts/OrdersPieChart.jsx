import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, Text, BlockStack, Spinner } from '@shopify/polaris';
import { useInsightsFetch } from '../../hooks/useInsightsFetch';

const COLORS = ['#008060', '#5C6AC4', '#006FBB', '#47C1BF', '#FFC96B', '#DC5E63', '#7B6BD6'];

// Map report types to breakdown API types
const REPORT_TYPE_TO_BREAKDOWN = {
  ordersByStatus: 'status',
  ordersByChannel: 'channel',
  ordersByPaymentMethod: 'payment_method',
  ordersByDiscount: 'discount',
};

// Chart titles for each report type
const CHART_TITLES = {
  ordersByStatus: 'Orders by Status',
  ordersByChannel: 'Orders by Channel',
  ordersByPaymentMethod: 'Orders by Payment Method',
  ordersByDiscount: 'Orders by Discount',
};

export default function OrdersPieChart({ filters }) {
  const { getOrderBreakdown } = useInsightsFetch();
  const [orderData, setOrderData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartTitle, setChartTitle] = useState('Orders Breakdown');

  const fetchOrderData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { dateRange, reportType } = filters;
      
      // Ensure we have valid date range
      if (!dateRange || !dateRange.start || !dateRange.end) {
        setError('Invalid date range');
        setLoading(false);
        return;
      }

      // Get the breakdown type from report type
      const breakdownType = REPORT_TYPE_TO_BREAKDOWN[reportType];
      if (!breakdownType) {
        setError('Invalid report type');
        setLoading(false);
        return;
      }

      // Format dates as YYYY-MM-DD
      const startDate = new Date(dateRange.start).toISOString().split('T')[0];
      const endDate = new Date(dateRange.end).toISOString().split('T')[0];

      // Set chart title
      setChartTitle(CHART_TITLES[reportType] || 'Orders Breakdown');

      // Fetch breakdown data from backend
      const data = await getOrderBreakdown({
        type: breakdownType,
        startDate,
        endDate,
      });

      // Transform data for pie chart
      const chartData = data.data.map(item => ({
        name: item.name,
        value: item.value,
        revenue: item.revenue,
      }));

      setOrderData(chartData);
      
    } catch (err) {
      setError(err.message || 'Failed to fetch order data');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, getOrderBreakdown]);

  useEffect(() => {
    if (filters && filters.dateRange && filters.reportType) {
      fetchOrderData();
    }
  }, [filters, fetchOrderData]);

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null; // Don't show labels for very small slices
    
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

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{data.name}</p>
          <p style={{ margin: '4px 0 0 0' }}>Orders: {data.value}</p>
          <p style={{ margin: '4px 0 0 0' }}>Revenue: ${data.revenue?.toFixed(2) || '0.00'}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Text variant="headingMd" as="h3" tone="critical">Error loading data</Text>
        <Text>{error}</Text>
      </div>
    );
  }

  if (orderData.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Text variant="headingMd" as="h3">No order data available</Text>
        <Text>Try adjusting your date range or wait for orders to be processed through webhooks.</Text>
      </div>
    );
  }

  return (
    <BlockStack gap="300">
      <Text variant="headingMd" as="h3">{chartTitle}</Text>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={orderData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {orderData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </BlockStack>
  );
}
