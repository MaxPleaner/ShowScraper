import React from 'react';

const DayEventsGrid = ({ children, textOnly }) => (
  <div className={`Day-events is-multiline ${textOnly ? '' : 'masonry-with-columns'}`}>
    {children}
  </div>
);

export default DayEventsGrid;
