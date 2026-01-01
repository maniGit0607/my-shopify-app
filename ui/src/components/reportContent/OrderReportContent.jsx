import React, { useState, useEffect } from 'react';
import { Select, TextField, InlineStack, BlockStack } from '@shopify/polaris';
import DateRangePicker from '../util/date/DateRangePicker';


export default function OrdersReportContent({ onFilterChange }){
    const today = new Date();
    const [selectedReport, setSelectedReport] = useState('ordersByStatus');
    const [dateRange, setDateRange] = useState({
      start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30),
      end: today,
    });

    // Send initial filter values to parent on mount
    useEffect(() => {
      if (onFilterChange) {
        onFilterChange({ reportType: selectedReport, dateRange });
      }
    }, []);

    const reportOptions = [
        { label: 'Orders by Status', value: 'ordersByStatus' },
        { label: 'Orders by Discount', value: 'ordersByDiscount' },
        { label: 'Orders by Channel', value: 'ordersByChannel' },
        { label: 'Orders by Payment Method', value: 'ordersByPaymentMethod' },
      ];
    
      // Handler for changing the selected report
      const handleReportChange = (value) => {
        setSelectedReport(value);
        if (onFilterChange) {
          onFilterChange({ reportType: value, dateRange });
        }
      };

      const handleDateRangeChange = (newDateRange) => {
        setDateRange(newDateRange);
        if (onFilterChange) {
          onFilterChange({ reportType: selectedReport, dateRange: newDateRange });
        }
      };

      // Render content based on selected report type
  const renderReportFilters = () => {
    // All report types use the same date range picker
    return (
      <InlineStack align='space-between' blockAlign='end'>
        <DateRangePicker onChange={handleDateRangeChange} />
      </InlineStack>
    );
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