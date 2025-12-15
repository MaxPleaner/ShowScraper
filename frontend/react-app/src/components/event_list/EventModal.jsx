import React from 'react';
import MissingImage from '../../MissingImage.png';
import EventButtons from './EventButtons';

export default class EventModal extends React.Component {
  render() {
    const { event, isOpen, onClose } = this.props;

    if (!isOpen || !event) return null;

    let imgSrc = event.img;
    if (imgSrc == "" || imgSrc == null) {
      // Default to the venue's image
      imgSrc = event.source.img;
    }

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
              <EventButtons event={event} />
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
