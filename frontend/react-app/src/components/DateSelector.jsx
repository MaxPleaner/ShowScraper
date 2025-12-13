import React from 'react';

const DateSelector = ({
  currentValue,
  nextValue,
  previousValue,
  onPreviousClick,
  onNextClick
}) => (
  <div className='eventDates'>
    <a onClick={onPreviousClick}>
      <div className='date-range-select  nav-item'>{previousValue}</div>
    </a>
    <div className='date-range-select-static  nav-item selected'>{currentValue}</div>
    <a onClick={onNextClick}>
      <div className='date-range-select  nav-item'>{nextValue}</div>
    </a>
  </div>
);

export default DateSelector;
