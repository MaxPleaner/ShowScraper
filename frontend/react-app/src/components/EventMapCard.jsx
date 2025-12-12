import React from 'react';
import MissingImage from '../MissingImage.png';

export default class EventMapCard extends React.Component {
  render() {
    const { event } = this.props;
    let imgSrc = event.img;
    if (imgSrc == "" || imgSrc == null) {
      imgSrc = event.source.img;
    }

    return (
      <div className='event-map-card-image-only'>
        <img
          src={imgSrc}
          alt={event.title}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = MissingImage;
          }}
        />
      </div>
    );
  }
}
