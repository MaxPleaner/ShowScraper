import React from 'react';
import EventListView from '../event_list/EventListView';

const MissingEventsModal = ({ onClose, events }) => {
  return (
    <div className='missing-events-modal-overlay' onClick={onClose}>
      <div className='missing-events-modal-content' onClick={(e) => e.stopPropagation()}>
        <button className='event-modal-close' onClick={onClose}>×</button>
        <h2>Events Without Location Data</h2>
        <EventListView textOnly={true} events={events} />
      </div>
    </div>
  );
};

export default MissingEventsModal;
