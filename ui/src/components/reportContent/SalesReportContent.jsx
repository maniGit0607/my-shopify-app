import React, { useState } from 'react';
import { Select, TextField, InlineStack, BlockStack } from '@shopify/polaris';
import DateRangePicker from '../util/date/DateRangePicker';


export default function SalesReportContent(){

    const [selectedReport, setSelectedReport] = useState('salesOverTime');
    const [interval, setInterval] = useState('daily');

    const reportOptions = [
        { label: 'Sales Over Time', value: 'salesOverTime' },
        { label: 'Sales by Discount', value: 'salesByDiscount' },
        { label: 'Sales by Traffic Source', value: 'salesByTrafficSource' },
        { label: 'Sales by Channel', value: 'salesByChannel' },
        { label: 'Sales by Payment Method', value: 'salesByPaymentMethod' },
      ];
    
      // Handler for changing the selected report
      const handleReportChange = (value) => {
        setSelectedReport(value);
      };

      // Render content based on selected report type
  const renderReportFilters = () => {
    switch (selectedReport) {
      case 'salesOverTime':
        return (
          <InlineStack align='space-between' blockAlign='end'>
            <DateRangePicker />
            <Select
              label="Interval"
              labelInline
              options={[
                { label: 'Daily', value: 'daily' },
                { label: 'Weekly', value: 'weekly' },
                { label: 'Monthly', value: 'monthly' },
              ]}
              value={interval}
              onChange={(value) => setInterval(value)}
            />
          </InlineStack>
        );
      case 'salesByDiscount':
        return (
            <InlineStack align='space-between' blockAlign='end'>
              <DateRangePicker />
            </InlineStack>
          );
      case 'salesByTrafficSource':
        return (
            <InlineStack align='space-between' blockAlign='end'>
              <DateRangePicker />
            </InlineStack>
          );
      case 'salesByChannel':
        return (
            <InlineStack align='space-between' blockAlign='end'>
              <DateRangePicker />
            </InlineStack>
          );
      case 'salesByPaymentMethod':
        return (
            <InlineStack align='space-between' blockAlign='end'>
              <DateRangePicker />
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
        label="Select Sales Report"
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