import React, { useMemo, useState } from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import * as Atoms from '../../state/atoms';
import * as DateUtils from '../../utils/dateUtils';
import { filterEventsList } from '../../utils/eventFilterUtils';
import useConsoleCommands from '../../hooks/useConsoleCommands';
import MapView from '../MapView';
import EventListView from '../EventListView';
import EventModal from '../EventModal';
import AiIntegrationNotice from '../AiIntegrationNotice';
import OtherEventLists from '../OtherEventLists';
import DateSelector from '../DateSelector';

const MapViewManager = () => {
  const allEvents = useRecoilValue(Atoms.eventsState);
  const venues = useRecoilValue(Atoms.venuesState);
  const [currentDay, setCurrentDay] = useRecoilState(Atoms.currentDayState);
  const setAIModalEvent = useSetRecoilState(Atoms.aiModalEventState);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);

  useConsoleCommands(venues, allEvents);

  const events = useMemo(
    () => filterEventsList(allEvents || {}, currentDay, 'day', ''),
    [allEvents, currentDay]
  );

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
    setAIModalEvent(event);
  };

  const closeEventModal = () => {
    setSelectedEvent(null);
    setShowEventModal(false);
  };

  return (
    <div className='MapViewManager'>
      <AiIntegrationNotice />
      <br />
      <OtherEventLists />
      <br />
      <DateSelector
        currentValue={DateUtils.currentDateEntry(currentDay, 'day')}
        nextValue={DateUtils.nextDateEntry(currentDay, 'day')}
        previousValue={DateUtils.prevDateEntry(currentDay, 'day')}
        onPreviousClick={() => setCurrentDay((prev) => DateUtils.prevDate(prev, 'day'))}
        onNextClick={() => setCurrentDay((prev) => DateUtils.nextDate(prev, 'day'))}
      />

      <MapView
        events={events}
        venues={venues}
        onEventClick={handleEventClick}
      />
      <EventListView textOnly={true} events={events}/>
      <EventModal
        isOpen={showEventModal}
        event={selectedEvent}
        onClose={closeEventModal}
      />
    </div>
  );
};

export default MapViewManager;
