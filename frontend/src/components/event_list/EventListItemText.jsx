import React, { useMemo } from 'react';
import EventButtons from './EventButtons';
import { truncateTitle } from '../../utils/textUtils';

const EventListItemText = ({ event }) => {
  const title = useMemo(() => truncateTitle(event.title), [event.title]);
  return (
    <>
      <div className='textViewEntry'>
        <div className='textViewLink'>
          <EventButtons event={event} />
          <a href={event.url}>
            <b className='textViewVenue'>{event.source.commonName}</b>
            <span className='textViewTitle'> {title}</span>
          </a>
        </div>
      </div>
    </>
  );
};

export default EventListItemText;
