import React, { useMemo, useState } from 'react';
import MissingImage from '../MissingImage.png';
import { truncateTitle } from '../utils/textUtils';

const EventListItemFlyer = ({ event }) => {
  const [overlayDisplay, setOverlayDisplay] = useState('none');
  const title = useMemo(() => truncateTitle(event.title), [event.title]);
  const imgSrc = useMemo(() => {
    if (event.img && event.img !== '') return event.img;
    return event.source.img || MissingImage;
  }, [event.img, event.source.img]);

  const onImageError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = MissingImage;
  };

  const touchStart = (path) => window.open(path, '_blank');
  const click = (path) => {
    if (overlayDisplay === 'block') window.open(path, '_blank');
  };

  return (
    <span
      className='event-link'
      href={event.url}
      onMouseEnter={() => setOverlayDisplay('block')}
      onMouseLeave={() => setOverlayDisplay('none')}
      onTouchStart={() => touchStart(event.url)}
    >
      <div className='Event-box'>
        <div className='img-container'>
          <img className='Event-img' src={imgSrc} onError={onImageError} />
          <div
            onPointerDown={() => click(event.url)}
            className='event-description pseudo-link'
            style={{ display: overlayDisplay }}
          >
            <span className='event-venue'> {event.source.commonName} </span>
            <h1 className='event-title'>
              <span> {title} </span>
            </h1>
          </div>
        </div>
      </div>
    </span>
  );
};

export default EventListItemFlyer;
