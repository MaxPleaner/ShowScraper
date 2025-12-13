import React from 'react';

const statusTextMap = {
  gathering_overview: 'Gathering overview…',
  preparing_items: 'Preparing items…',
  filling_details: 'Filling in details…',
};

const AiLoadingMessage = ({ text, view }) => {
  const label = text || (view ? statusTextMap[view.status] : null);
  if (!label) return null;
  return (
    <div className="ai-loading">
      <i className="fas fa-spinner fa-spin"></i>
      <span> {label}</span>
    </div>
  );
};

export default AiLoadingMessage;
