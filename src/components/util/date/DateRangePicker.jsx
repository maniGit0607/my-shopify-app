import React, { useState, useCallback } from 'react';
import {
  DatePicker,
  Popover,
  Button,
  Select,
  BlockStack,
  TextField,
} from '@shopify/polaris';

export default function DateRangePicker() {
  const today = new Date();
  const [popoverActive, setPopoverActive] = useState(false);
  const [selectedDates, setSelectedDates] = useState({
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6), // Default: Last 7 days
    end: today,
  });

  const [relativeOption, setRelativeOption] = useState('last7Days'); // Default relative option

  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const togglePopoverActive = useCallback(
    () => setPopoverActive((popoverActive) => !popoverActive),
    []
  );

  const handleRelativeChange = (value) => {
    setRelativeOption(value);
    const newDates = calculateRelativeDates(value);
    setSelectedDates(newDates);
  };

  const handleDateChange = (value) => {
    setSelectedDates(value);
  };

  const calculateRelativeDates = (option) => {
    const today = new Date();
    switch (option) {
      case 'last7Days':
        return {
          start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6),
          end: today,
        };
      case 'last30Days':
        return {
          start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29),
          end: today,
        };
      case 'last60Days':
        return {
          start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 59),
          end: today,
        };
      case 'last90Days':
        return {
          start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 89),
          end: today,
        };
      case 'last180Days':
        return {
          start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 179),
          end: today,
        };
      case 'lastMonth':
        return {
          start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
          end: new Date(today.getFullYear(), today.getMonth() - 1, 31),
        };
      case 'lastYear':
        return {
          start: new Date(today.getFullYear() - 1, 0, 1),
          end: new Date(today.getFullYear() - 1, 11, 31),
        };
      case 'oneYearToDate':
        return {
          start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 364),
          end: today,
        };
      case 'twoYearToDate':
        return {
          start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 729),
          end: today,
        };
      case 'threeYearToDate':
        return {
          start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1094),
          end: today,
        };
      default:
        return { start: today, end: today };
    }
  };

  const relativeOptions = [
    { label: 'Last 7 days', value: 'last7Days' },
    { label: 'Last 30 days', value: 'last30Days' },
    { label: 'Last 60 days', value: 'last60Days' },
    { label: 'Last 90 days', value: 'last90Days' },
    { label: 'Last 180 days', value: 'last180Days' },
    { label: 'Last month', value: 'lastMonth' },
    { label: 'Last year', value: 'lastYear' },
    { label: '1 year to date', value: 'oneYearToDate' },
    { label: '2 year to date', value: 'twoYearToDate' },
    { label: '3 year to date', value: 'threeYearToDate' },
  ];

  return (
    <div>
      <Popover
        active={popoverActive}
        activator={
          <Button onClick={togglePopoverActive} disclosure>
            Select Date Range
          </Button>
        }
        onClose={togglePopoverActive}
      >
        <div style={{ padding: '16px', maxWidth: '300px' }}>
          <BlockStack gap="300">
            <Select
              label="Relative Dates"
              options={relativeOptions}
              onChange={handleRelativeChange}
              value={relativeOption}
            />
            <DatePicker
              month={month}
              year={year}
              onChange={handleDateChange}
              onMonthChange={(newMonth, newYear) => {
                setMonth(newMonth);
                setYear(newYear);
              }}
              selected={selectedDates}
              allowRange
            />
            <TextField
              label="Selected Range"
              value={`${selectedDates.start.toDateString()} - ${selectedDates.end.toDateString()}`}
              readOnly
            />
          </BlockStack>
        </div>
      </Popover>
    </div>
  );
}
