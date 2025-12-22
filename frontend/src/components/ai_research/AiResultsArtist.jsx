import React from 'react';

const AiResultsArtist = ({ name, children }) => (
  <div className="artist-progress-row artist-fields">
    <div className="artist-name">{name}</div>
    <div className="artist-fields-list">
      {children}
    </div>
  </div>
);

export default AiResultsArtist;
