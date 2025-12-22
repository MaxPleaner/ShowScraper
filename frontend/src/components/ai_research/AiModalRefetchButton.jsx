import React from 'react';

const AiModalRefetchButton = ({ onRefetch }) => (
  <button
    className="ai-refetch"
    onClick={onRefetch}
    title="Re-run AI research (ignores cache)"
  >
    Re-fetch
  </button>
);

export default AiModalRefetchButton;
