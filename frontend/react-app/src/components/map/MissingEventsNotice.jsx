import React from 'react';

const MissingEventsNotice = ({ count, onClick }) => {
  if (!count) return null;
  return (
    <div className='map-events-missing-notice' onClick={onClick}>
      {count} event{count !== 1 ? 's' : ''} not shown on map (no location registered for venue)
    </div>
  );
};

export default MissingEventsNotice;
