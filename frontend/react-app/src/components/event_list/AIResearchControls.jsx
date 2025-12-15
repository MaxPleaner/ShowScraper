import React from 'react';
import { useSetRecoilState } from 'recoil';
import * as Atoms from '../state/atoms';

const AIResearchControls = ({ event }) => {
  const setOpen = useSetRecoilState(Atoms.aiModalOpenState);
  const setEvent = useSetRecoilState(Atoms.aiModalEventState);

  const openModal = () => {
    setEvent(event);
    setOpen(true);
  };

  return (
    <a
      onClick={openModal}
      className='calendar-button ai-button'
      title='AI Concert Research (streamed & proofread)'
      data-tooltip='AI Concert Research'
    >
      <i className='fas fa-robot'></i>
    </a>
  );
};

export default AIResearchControls;
