import React from 'react';
import moment from 'moment';
import MissingImage from '../MissingImage.png';

export default class EventModal extends React.Component {
  generateCalendarLinks(event) {
    const date = moment(event.date, 'MM-DD').format('YYYYMMDD');
    const title = encodeURIComponent(`${event.title} at ${event.source.commonName}`);
    const location = encodeURIComponent(event.source.commonName);
    const description = encodeURIComponent(`Event URL: ${event.url}`);

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&dates=${date}/${date}&text=${title}&location=${location}&details=${description}`;
    const icalUrl = `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:${date}%0ADTEND:${date}%0ASUMMARY:${title}%0ALOCATION:${location}%0ADESCRIPTION:${description}%0AEND:VEVENT%0AEND:VCALENDAR`;

    return {
      google: googleCalendarUrl,
      ical: icalUrl
    };
  }

  render() {
    const { event, isOpen, onClose, onAIClick } = this.props;

    if (!isOpen || !event) return null;

    let imgSrc = event.img;
    if (imgSrc == "" || imgSrc == null) {
      imgSrc = event.source.img;
    }

    const calendarLinks = this.generateCalendarLinks(event);

    return (
      <div className='event-modal-overlay' onClick={onClose}>
        <div className='event-modal-content' onClick={(e) => e.stopPropagation()}>
          <button className='event-modal-close' onClick={onClose}>×</button>

          <div className='event-modal-image'>
            <img
              src={imgSrc}
              alt={event.title}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = MissingImage;
              }}
            />
          </div>

          <div className='event-modal-body'>
            <h2 className='event-modal-venue'>{event.source.commonName}</h2>
            <p className='event-modal-title'>{event.title}</p>

            <div className='event-modal-actions'>
              <a
                href={calendarLinks.google}
                target="_blank"
                rel="noopener noreferrer"
                className='event-modal-btn'
                title="Add to Google Calendar"
              >
                <i className="fab fa-google"></i>
                <span>Google Calendar</span>
              </a>

              <a
                href={calendarLinks.ical}
                download={`${event.title}.ics`}
                className='event-modal-btn'
                title="Download iCal"
              >
                <i className="fas fa-calendar-alt"></i>
                <span>Download .ics</span>
              </a>

              <button
                onClick={() => {
                  onClose();
                  onAIClick(event);
                }}
                className='event-modal-btn event-modal-btn-ai'
                title="AI Concert Research"
              >
                <i className="fas fa-robot"></i>
                <span>AI Research</span>
              </button>

              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className='event-modal-btn'
                title="View Event Page"
              >
                <i className="fas fa-external-link-alt"></i>
                <span>Event Page</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
