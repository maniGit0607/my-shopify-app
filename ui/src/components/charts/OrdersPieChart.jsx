import React from 'react';
import { useQuery, gql } from '@apollo/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Text, BlockStack, Spinner } from '@shopify/polaris';

const COLORS = ['#008060', '#5C6AC4', '#006FBB', '#47C1BF', '#FFC96B', '#DC5E63', '#7B6BD6'];

// GraphQL query for fetching orders
const GET_ORDERS = gql`
  query GetOrders($query: String!) {
    orders(first: 250, query: $query) {
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

export default function OrdersPieChart({ filters }) {
  const { dateRange } = filters;
  
  // Prepare query string for Shopify
  const startDate = dateRange?.start ? new Date(dateRange.start).toISOString().split('T')[0] : '';
  const endDate = dateRange?.end ? new Date(dateRange.end).toISOString().split('T')[0] : '';
  const queryString = `created_at:>='${startDate}' AND created_at:<='${endDate}'`;

  // Use Apollo query with automatic caching and loading states
  const { loading, error, data } = useQuery(GET_ORDERS, {
    variables: { query: queryString },
    skip: !startDate || !endDate, // Skip query if dates not available
  });

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

  // Handle loading state
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spinner size="large" />
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Text variant="headingMd" as="h3" tone="critical">Error loading data</Text>
        <Text>{error.message}</Text>
      </div>
    );
  }

  // Process orders by status
  const orders = data?.orders?.edges || [];
  const orderData = processOrdersByStatus(orders);

  // Handle empty data
  if (orderData.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Text variant="headingMd" as="h3">No order data available</Text>
        <Text>Try adjusting your date range or filters</Text>
      </div>
    );
  }

  // Render custom label with percentage
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

