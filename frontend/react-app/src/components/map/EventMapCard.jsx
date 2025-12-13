import React from 'react';

export default class EventMapCard extends React.Component {
  render() {
    const { event } = this.props;

    let imgSrc = event.img;
    if (imgSrc === '' || imgSrc == null) {
      imgSrc = event.source.img;
    }

    return (
      <div className='event-map-card-image-only'>
        <img
          src={imgSrc}
          alt={event.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }
}
