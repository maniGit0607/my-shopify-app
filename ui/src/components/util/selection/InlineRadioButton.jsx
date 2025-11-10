import React, { useState } from 'react';
import { RadioButton, InlineStack } from '@shopify/polaris';

function InlineRadioButtons() {
    const [selected, setSelected] = useState('option1');

    const handleChange = (value) => setSelected(value);
  
    return (
      <InlineStack gap='100'>
        <RadioButton
          label="Option 1"
          checked={selected === 'option1'}
          id="option1"
          name="options"
          onChange={() => handleChange('option1')}
        />
        <RadioButton
          label="Option 2"
          checked={selected === 'option2'}
          id="option2"
          name="options"
          onChange={() => handleChange('option2')}
        />
        <RadioButton
          label="Option 3"
          checked={selected === 'option3'}
          id="option3"
          name="options"
          onChange={() => handleChange('option3')}
        />
      </InlineStack>
    );
}

export default InlineRadioButtons;
