import React from 'react';

const AiResultsArtistField = ({ field, value, progress }) => (
  <div className="artist-field-row">
    <span className="artist-field-name">{field}:</span>
    {value ? (
      <span className="artist-field-value"> {String(value)}</span>
    ) : (
      <div className="progress-track" aria-label={`Loading ${field}`}>
        <div
          className="progress-fill"
          style={{ width: progress ? `${progress}%` : '2%' }}
        ></div>
        <div className="progress-percent">{progress ? `${progress}%` : '0%'}</div>
      </div>
    )}
  </div>
);

export default AiResultsArtistField;
