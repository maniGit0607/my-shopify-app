import React, { useState } from 'react';
import { Select, TextField, InlineStack, BlockStack } from '@shopify/polaris';
import DateRangePicker from '../util/date/DateRangePicker';


export default function OrdersReportContent({ onFilterChange }){
    const today = new Date();
    const [selectedReport, setSelectedReport] = useState('ordersOverTime');
    const [interval, setInterval] = useState('daily');
    const [dateRange, setDateRange] = useState({
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 364),
      end: today,
    });

    const reportOptions = [
        { label: 'Orders Over Time', value: 'ordersOverTime' },
        { label: 'Orders by Discount', value: 'ordersByDiscount' },
        { label: 'Orders by Traffic Source', value: 'ordersByTrafficSource' },
        { label: 'Orders by Channel', value: 'ordersByChannel' },
        { label: 'Orders by Payment Method', value: 'ordersByPaymentMethod' },
        { label: 'Orders by Status', value: 'ordersByStatus' },
      ];
    
      // Handler for changing the selected report
      const handleReportChange = (value) => {
        setSelectedReport(value);
        if (onFilterChange) {
          onFilterChange({ reportType: value, interval, dateRange });
        }
      };

      const handleIntervalChange = (value) => {
        setInterval(value);
        if (onFilterChange) {
          onFilterChange({ reportType: selectedReport, interval: value, dateRange });
        }
      };

      const handleDateRangeChange = (newDateRange) => {
        setDateRange(newDateRange);
        if (onFilterChange) {
          onFilterChange({ reportType: selectedReport, interval, dateRange: newDateRange });
        }
      };

      // Render content based on selected report type
  const renderReportFilters = () => {
    switch (selectedReport) {
      case 'ordersOverTime':
        return (
          <InlineStack align='space-between' blockAlign='end'>
            <DateRangePicker onChange={handleDateRangeChange} />
            <Select
              label="Interval"
              labelInline
              options={[
                { label: 'Daily', value: 'daily' },
                { label: 'Weekly', value: 'weekly' },
                { label: 'Monthly', value: 'monthly' },
              ]}
              value={interval}
              onChange={handleIntervalChange}
            />
          </InlineStack>
        );
      case 'ordersByDiscount':
        return (
            <InlineStack align='space-between' blockAlign='end'>
              <DateRangePicker onChange={handleDateRangeChange} />
            </InlineStack>
          );
      case 'ordersByTrafficSource':
        return (
            <InlineStack align='space-between' blockAlign='end'>
              <DateRangePicker onChange={handleDateRangeChange} />
            </InlineStack>
          );
      case 'ordersByChannel':
        return (
            <InlineStack align='space-between' blockAlign='end'>
              <DateRangePicker onChange={handleDateRangeChange} />
            </InlineStack>
          );
      case 'ordersByPaymentMethod':
        return (
            <InlineStack align='space-between' blockAlign='end'>
              <DateRangePicker onChange={handleDateRangeChange} />
            </InlineStack>
          );
        case 'ordersByStatus':
        return (
            <InlineStack align='space-between' blockAlign='end'>
                <DateRangePicker onChange={handleDateRangeChange} />
            </InlineStack>
            );
      default:
        return null;
    }
  };

  return (
    <BlockStack gap='200'>
    <InlineStack>
      <Select
        label="Select Orders Report"
        labelInline
        options={reportOptions}
        value={selectedReport}
        onChange={handleReportChange}
      />
    </InlineStack>
      <div style={{ marginTop: '20px' }}>
        {renderReportFilters()}
      </div>
    </BlockStack>
  );

}