import React from 'react';

const AiErrorMessage = ({ error }) => (
  <div className="ai-error">
    <i className="fas fa-exclamation-triangle"></i>
    <span> {error}</span>
  </div>
);

export default AiErrorMessage;
