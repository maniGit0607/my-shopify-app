import React, { useCallback, useState } from 'react';
import { Select, TextField, InlineStack, BlockStack } from '@shopify/polaris';
import DateRangePicker from '../util/date/DateRangePicker';


export default function ProductReportContent(){

    const [selectedReport, setSelectedReport] = useState('topSalesByProduct');
    const [interval, setInterval] = useState('daily');

    const reportOptions = [
        { label: 'Top Products by Sales', value: 'topSalesByProduct' },
        { label: 'Top Product Variants by Sales', value: 'topSalesByProductVariant' },
        { label: 'Top Products by Orders', value: 'topOrdersByProduct' },
        { label: 'Top Product Variants by Orders', value: 'topOrdersByProductVariant' },
        { label: 'Top Products by Units sold', value: 'topUnitsByProduct' },
        { label: 'Top Product Variants by Units sold', value: 'topUnitsByProductVariant' },
        { label: 'Product Total Sales Value', value: 'productTotalSales' },
      ];
    
      // Handler for changing the selected report
      const handleReportChange = (value) => {
        setSelectedReport(value);
      };
    
    const [topCount, setTopCount] = useState('');
    const handleTopCountChange = useCallback((newValue) => setTopCount(newValue), []);

      // Render content based on selected report type
  const renderReportFilters = () => {
    switch (selectedReport) {
      case 'topSalesByProduct':
        return (
          <InlineStack align='space-between' blockAlign='end'>
            <DateRangePicker />
            <TextField
                  value={topCount}
                  onChange={handleTopCountChange}
                  placeholder="Enter number of top products to get"
                  autoComplete="off"
                />
          </InlineStack>
        );
      case 'topSalesByProductVariant':
        return (
            <InlineStack align='space-between' blockAlign='end'>
              <DateRangePicker />
              <TextField
                    value={topCount}
                    onChange={handleTopCountChange}
                    placeholder="Enter number of top product variants to get"
                    autoComplete="off"
                  />
            </InlineStack>
          );
      case 'topOrdersByProduct':
        return (
            <InlineStack align='space-between' blockAlign='end'>
              <DateRangePicker />
              <TextField
                    value={topCount}
                    onChange={handleTopCountChange}
                    placeholder="Enter number of top products to get"
                    autoComplete="off"
                  />
            </InlineStack>
          );
      case 'topOrdersByProductVariant':
        return (
            <InlineStack align='space-between' blockAlign='end'>
              <DateRangePicker />
              <TextField
                    value={topCount}
                    onChange={handleTopCountChange}
                    placeholder="Enter number of top product variants to get"
                    autoComplete="off"
                  />
            </InlineStack>
          );
      case 'topUnitsByProduct':
        return (
            <InlineStack align='space-between' blockAlign='end'>
              <DateRangePicker />
              <TextField
                    value={topCount}
                    onChange={handleTopCountChange}
                    placeholder="Enter number of top products to get"
                    autoComplete="off"
                  />
            </InlineStack>
          );
      case 'topUnitsByProductVariant':
        return (
            <InlineStack align='space-between' blockAlign='end'>
              <DateRangePicker />
              <TextField
                    value={topCount}
                    onChange={handleTopCountChange}
                    placeholder="Enter number of top product variants to get"
                    autoComplete="off"
                  />
            </InlineStack>
          );
      case 'productTotalSales':
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
        label="Select Product Report"
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