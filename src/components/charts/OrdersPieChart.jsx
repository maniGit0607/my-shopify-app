import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, Text, BlockStack, Spinner } from '@shopify/polaris';
import { useAuthenticatedFetch } from '@shopify/app-bridge-react';

const COLORS = ['#008060', '#5C6AC4', '#006FBB', '#47C1BF', '#FFC96B', '#DC5E63', '#7B6BD6'];

export default function OrdersPieChart({ filters }) {
  const fetch = useAuthenticatedFetch();
  const [orderData, setOrderData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (filters && filters.dateRange) {
      fetchOrderData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchOrderData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { dateRange } = filters;
      
      // Ensure we have valid date range
      if (!dateRange || !dateRange.start || !dateRange.end) {
        setError('Invalid date range');
        setLoading(false);
        return;
      }
      
      const startDate = new Date(dateRange.start).toISOString();
      const endDate = new Date(dateRange.end).toISOString();

      const query = `
        query {
          orders(first: 250, query: "created_at:>='${startDate.split('T')[0]}' AND created_at:<='${endDate.split('T')[0]}'") {
            edges {
              node {
                id
                name
                createdAt
                displayFinancialStatus
                displayFulfillmentStatus
                totalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      `;

      const response = await fetch('/admin/api/2024-10/graphql.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      // Process data based on report type
      const orders = data.data?.orders?.edges || [];
      const processedData = processOrdersByStatus(orders);
      setOrderData(processedData);
      
    } catch (err) {
      setError(err.message || 'Failed to fetch order data');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const processOrdersByStatus = (orders) => {
    const statusCounts = {};
    
    orders.forEach(({ node }) => {
      const status = node.displayFulfillmentStatus || 'UNFULFILLED';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0) + name.slice(1).toLowerCase().replace('_', ' '),
      value,
    }));
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
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
        style={{ fontWeight: 'bold' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
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
        <Text>Try adjusting your date range or filters</Text>
      </div>
    );
  }

  return (
    <BlockStack gap="300">
      <Text variant="headingMd" as="h3">Orders by Status</Text>
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
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </BlockStack>
  );
}

