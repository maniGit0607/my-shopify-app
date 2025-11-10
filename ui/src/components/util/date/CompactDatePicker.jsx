import React, { useState, useCallback } from 'react';
import { TextField, Popover, ActionList, Button, DatePicker } from '@shopify/polaris';

export default function CompactDatePicker({label}) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [popoverActive, setPopoverActive] = useState(false);

  // State for DatePicker
  const [{ month, year }, setDate] = useState({
    month: selectedDate.getMonth(),
    year: selectedDate.getFullYear(),
  });

  // Toggle popover visibility
  const togglePopoverActive = useCallback(
    () => setPopoverActive((active) => !active),
    []
  );

  // Handle date selection
  const handleDateChange = (value) => {
    setSelectedDate(value.start);
    togglePopoverActive(); // Close popover after date selection
  };

  return (
    <div>
      <Popover
        active={popoverActive}
        activator={
          <TextField
            label={label}
            value={selectedDate.toDateString()}
            onFocus={togglePopoverActive}
            readOnly
          />
        }
        onClose={togglePopoverActive}
      >
        <DatePicker
          month={month}
          year={year}
          onChange={handleDateChange}
          onMonthChange={(month, year) => setDate({ month, year })}
          selected={{ start: selectedDate, end: selectedDate }}
        />
      </Popover>
    </div>
  );
}
