import React from 'react';
import { useSetRecoilState } from 'recoil';
import { aiModalOpenState, aiModalEventState } from '../state/atoms';

const AIResearchControls = ({ event }) => {
  const setOpen = useSetRecoilState(aiModalOpenState);
  const setEvent = useSetRecoilState(aiModalEventState);

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
