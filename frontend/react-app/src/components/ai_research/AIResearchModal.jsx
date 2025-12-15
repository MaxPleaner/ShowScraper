import React, { useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import * as Atoms from '../../state/atoms';
import AiModalHeader from './AiModalHeader';
import AiModalBody from './AiModalBody';
import useAIResearch from '../../hooks/useAIResearch';

const AIResearchModal = () => {
  const [isOpen, setIsOpen] = useRecoilState(Atoms.aiModalOpenState);
  const event = useRecoilValue(Atoms.aiModalEventState);
  const { actions: { runAIResearch } } = useAIResearch(event);

  useEffect(() => {
    if (isOpen && event) {
      runAIResearch();
    }
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  return (
    <div className="ai-modal-overlay" onClick={() => setIsOpen(false)}>
      <div className="ai-modal-content" onClick={(e) => e.stopPropagation()}>
        <AiModalHeader
          onRefetch={() => runAIResearch(true)}
          onClose={() => setIsOpen(false)}
        />
        <AiModalBody />
      </div>
    </div>
  );
};

export default AIResearchModal;
