import React from 'react';
import AIResearchControls from './AIResearchControls';
import GoogleCalendarButton from './GoogleCalendarButton';
import IcalCalendarButton from './IcalCalendarButton';

const EventButtons = ({ event }) => {
  return (
    <div className='calendar-buttons'>
      <GoogleCalendarButton event={event} />
      <IcalCalendarButton event={event} />
      <AIResearchControls event={event} />
    </div>
  );
};

export default EventButtons;
