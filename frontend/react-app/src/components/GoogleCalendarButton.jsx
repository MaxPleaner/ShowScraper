import React from 'react';
import { generateCalendarLinks } from '../utils/calendarLinkUtils';

const GoogleCalendarButton = ({ event }) => {
  const { google } = generateCalendarLinks(event);
  return (
    <a
      href={google}
      target='_blank'
      rel='noopener noreferrer'
      className='calendar-button'
      title='Add to Google Calendar (Google icon)'
      data-tooltip='Add to Google Calendar'
    >
      <i className='fab fa-google'></i>
    </a>
  );
};

export default GoogleCalendarButton;
