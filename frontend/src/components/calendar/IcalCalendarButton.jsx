import React from 'react';
import { generateCalendarLinks } from '../../utils/calendarLinkUtils';

const IcalCalendarButton = ({ event }) => {
  const { ical } = generateCalendarLinks(event);
  return (
    <a
      href={ical}
      download={`${event.title}.ics`}
      className='calendar-button'
      title='Download iCal / generic calendar (.ics)'
      data-tooltip='Download .ics for any calendar'
    >
      <i className='fas fa-calendar-alt'></i>
    </a>
  );
};

export default IcalCalendarButton;
