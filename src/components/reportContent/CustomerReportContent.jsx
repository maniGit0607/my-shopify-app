import React, { useCallback, useState } from 'react';
import { Select, TextField, InlineStack, BlockStack } from '@shopify/polaris';
import DateRangePicker from '../util/date/DateRangePicker';


export default function CustomerReportContent(){

    const [selectedReport, setSelectedReport] = useState('salesByCustomer');

    const reportOptions = [
        { label: 'Sales by Customer', value: 'salesByCustomer' },
        { label: 'Customers by geography', value: 'customersByGeo' },
        { label: 'New Customer Orders monthly', value: 'newCustomerOrders' },
      ];
    
      // Handler for changing the selected report
      const handleReportChange = (value) => {
        setSelectedReport(value);
      };
    

      // Render content based on selected report type
  const renderReportFilters = () => {
    switch (selectedReport) {
      case 'salesByCustomer':
        return (
          <InlineStack align='space-between' blockAlign='end'>
            <DateRangePicker />
          </InlineStack>
        );
      case 'customersByGeo':
        return (
          <InlineStack align='space-between' blockAlign='end'>
            <DateRangePicker />
          </InlineStack>
        )
      case 'newCustomerOrders':
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
        label="Select Customer Report"
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