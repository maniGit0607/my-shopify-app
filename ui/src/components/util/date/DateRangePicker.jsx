import React, { useState, useCallback, useEffect } from 'react';
import {
  DatePicker,
  Popover,
  Button,
  BlockStack,
  Box,
  Text,
} from '@shopify/polaris';
import { CalendarIcon, ClockIcon } from '@shopify/polaris-icons';

const RELATIVE_OPTIONS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: 'last7Days' },
  { label: 'Last 30 days', value: 'last30Days' },
  { label: 'Last 60 days', value: 'last60Days' },
  { label: 'Last 90 days', value: 'last90Days' },
  { label: 'This month', value: 'thisMonth' },
  { label: 'Last month', value: 'lastMonth' },
  { label: 'This year', value: 'thisYear' },
  { label: 'Last year', value: 'lastYear' },
  { label: '1 year to date', value: 'oneYearToDate' },
  { label: '2 years to date', value: 'twoYearToDate' },
  { label: '3 years to date', value: 'threeYearToDate' },
];

const calculateRelativeDates = (option) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  switch (option) {
    case 'today':
      return { start: today, end: today };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: yesterday };
    }
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
    case 'thisMonth':
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: today,
      };
    case 'lastMonth': {
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: lastMonthStart, end: lastMonthEnd };
    }
    case 'thisYear':
      return {
        start: new Date(today.getFullYear(), 0, 1),
        end: today,
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

export default function DateRangePicker({ onChange, defaultValue = 'last30Days' }) {
  const [popoverActive, setPopoverActive] = useState(false);
  const [activeTab, setActiveTab] = useState('relative'); // 'relative' or 'absolute'
  const [selectedRelative, setSelectedRelative] = useState(defaultValue);
  const [selectedDates, setSelectedDates] = useState(calculateRelativeDates(defaultValue));
  const [displayLabel, setDisplayLabel] = useState(
    RELATIVE_OPTIONS.find(o => o.value === defaultValue)?.label || 'Last 30 days'
  );
  
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const togglePopoverActive = useCallback(
    () => setPopoverActive((active) => !active),
    []
  );

  // Trigger onChange on mount with default values
  useEffect(() => {
    if (onChange) {
      onChange(selectedDates);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRelativeSelect = (option) => {
    const newDates = calculateRelativeDates(option.value);
    setSelectedRelative(option.value);
    setSelectedDates(newDates);
    setDisplayLabel(option.label);
    setPopoverActive(false);
    if (onChange) {
      onChange(newDates);
    }
  };

  const handleDateChange = (value) => {
    setSelectedDates(value);
    setSelectedRelative(null); // Clear relative selection
    
    // Format the date range for display
    const startStr = value.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = value.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setDisplayLabel(`${startStr} - ${endStr}`);
    
    // Close popover and trigger change immediately
    setPopoverActive(false);
    if (onChange) {
      onChange(value);
    }
  };

  const formatButtonLabel = () => {
    return displayLabel;
  };

  return (
    <Popover
      active={popoverActive}
      activator={
        <Button onClick={togglePopoverActive} disclosure>
          {formatButtonLabel()}
        </Button>
      }
      onClose={togglePopoverActive}
      preferredAlignment="right"
    >
      <div style={{ width: '320px' }}>
        {/* Tab Headers */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid #e1e3e5',
        }}>
          <button
            onClick={() => setActiveTab('relative')}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              background: activeTab === 'relative' ? '#f6f6f7' : 'white',
              borderBottom: activeTab === 'relative' ? '2px solid #008060' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'relative' ? '600' : '400',
              color: activeTab === 'relative' ? '#008060' : '#6d7175',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <ClockIcon style={{ width: '16px', height: '16px' }} />
            Relative
          </button>
          <button
            onClick={() => setActiveTab('absolute')}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              background: activeTab === 'absolute' ? '#f6f6f7' : 'white',
              borderBottom: activeTab === 'absolute' ? '2px solid #008060' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === 'absolute' ? '600' : '400',
              color: activeTab === 'absolute' ? '#008060' : '#6d7175',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <CalendarIcon style={{ width: '16px', height: '16px' }} />
            Absolute
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'relative' && (
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {RELATIVE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleRelativeSelect(option)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 16px',
                  border: 'none',
                  background: selectedRelative === option.value ? '#e3f1df' : 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  color: selectedRelative === option.value ? '#008060' : '#202223',
                  fontWeight: selectedRelative === option.value ? '500' : '400',
                  borderLeft: selectedRelative === option.value ? '3px solid #008060' : '3px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (selectedRelative !== option.value) {
                    e.target.style.background = '#f6f6f7';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedRelative !== option.value) {
                    e.target.style.background = 'white';
                  }
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'absolute' && (
          <div style={{ padding: '16px' }}>
            <BlockStack gap="300">
              <Text variant="bodySm" tone="subdued">
                Select a date range
              </Text>
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
                disableDatesAfter={today}
              />
            </BlockStack>
          </div>
        )}
      </div>
    </Popover>
  );
}
