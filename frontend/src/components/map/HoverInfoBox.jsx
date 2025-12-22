import React from 'react';

const HoverInfoBox = ({ event }) => {
  if (!event) return null;
  return (
    <div className='map-hover-info-box'>
      <div className='map-hover-venue'>{event.source.commonName || event.source.name}</div>
      <div className='map-hover-title'>{event.title}</div>
    </div>
  );
};

export default HoverInfoBox;
