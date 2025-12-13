import React from 'react';
import AiModalRefetchButton from './AiModalRefetchButton';
import AiModalCloseButton from './AiModalCloseButton';

const AiModalHeader = ({ onRefetch, onClose }) => (
  <div className="ai-modal-header">
    <h2>AI Concert Research</h2>
    <div className="ai-modal-controls">
      <AiModalRefetchButton onRefetch={onRefetch} />
      <AiModalCloseButton onClose={onClose} />
    </div>
  </div>
);

export default AiModalHeader;
