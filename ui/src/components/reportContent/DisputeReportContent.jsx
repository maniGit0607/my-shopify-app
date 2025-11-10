import React, { useCallback, useState } from 'react';
import { Select, TextField, InlineStack, BlockStack } from '@shopify/polaris';
import DateRangePicker from '../util/date/DateRangePicker';


export default function DisputeReportContent(){

    const [selectedReport, setSelectedReport] = useState('disputesOverTime');

    const reportOptions = [
        { label: 'Disputes Over Time', value: 'disputesOverTime' },
        { label: 'Dispute Outcomes', value: 'disputeOutcomes' },
        { label: 'Pending Disputes', value: 'pendingDisputes' },
      ];
    
      // Handler for changing the selected report
      const handleReportChange = (value) => {
        setSelectedReport(value);
      };
    

      // Render content based on selected report type
  const renderReportFilters = () => {
    switch (selectedReport) {
      case 'disputesOverTime':
        return (
          <InlineStack align='space-between' blockAlign='end'>
            <DateRangePicker />
          </InlineStack>
        );
      case 'disputeOutcomes':
        return (
          <InlineStack align='space-between' blockAlign='end'>
            <DateRangePicker />
          </InlineStack>
        )
      case 'pendingDisputes':
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
        label="Select Dispute Report"
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