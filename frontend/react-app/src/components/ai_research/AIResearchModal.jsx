import React, { useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { aiModalOpenState, aiModalEventState } from '../../state/atoms';
import AiModalHeader from './AiModalHeader';
import AiModalBody from './AiModalBody';
import useAIResearch from '../../hooks/useAIResearch';

const AIResearchModal = () => {
  const [isOpen, setIsOpen] = useRecoilState(aiModalOpenState);
  const event = useRecoilValue(aiModalEventState);
  const { actions: { handleAIResearch } } = useAIResearch(event);

  useEffect(() => {
    if (isOpen && event) {
      handleAIResearch();
    }
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  return (
    <div className="ai-modal-overlay" onClick={() => setIsOpen(false)}>
      <div className="ai-modal-content" onClick={(e) => e.stopPropagation()}>
        <AiModalHeader
          onRefetch={() => handleAIResearch(true)}
          onClose={() => setIsOpen(false)}
        />
        <AiModalBody />
      </div>
    </div>
  );
};

export default AIResearchModal;
