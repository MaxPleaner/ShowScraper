import React, { useMemo, useState } from 'react';
import { Columns, Box } from 'react-bulma-components';
const { Column } = Columns;
import EventListView from './EventListView'
import { useRecoilState, useRecoilValue } from 'recoil';
import { eventsState, currentDayState, timeGroupingModeState } from '../state/atoms';
import {
  currentDateEntry,
  nextDateEntry,
  prevDateEntry,
  nextDate,
  prevDate
} from '../utils/dateUtils';
import { filterEventsList } from '../utils/eventFilterUtils';
import AiIntegrationNotice from './AiIntegrationNotice';
import OtherEventLists from './OtherEventLists';
import SearchVenuesForm from './SearchVenuesForm';
import DateSelector from './DateSelector';

// This handles filtering the event list using dates and search.
// It calls EventListView which performs the actual rendering (either text or flyer)
const EventListViewManager = ({ textOnly }) => {
  const eventsFromStore = useRecoilValue(eventsState);
  const [currentDay, setCurrentDay] = useRecoilState(currentDayState);
  const [timeGroupingMode] = useRecoilState(timeGroupingModeState);
  const [search, setSearch] = useState("");

  const events = useMemo(
    () => filterEventsList(eventsFromStore || {}, currentDay, timeGroupingMode, search),
    [eventsFromStore, currentDay, timeGroupingMode, search]
  );

  const goToNextDate = () => setCurrentDay(prev => nextDate(prev, timeGroupingMode));
  const goToPrevDate = () => setCurrentDay(prev => prevDate(prev, timeGroupingMode));

  const onSearchInput = (event) => {
    setSearch(event.currentTarget.value);
  }

  return (
    <div className='ListViewManager'>

        <AiIntegrationNotice />
        <br />
        <OtherEventLists />
        <SearchVenuesForm onChange={onSearchInput} />
        <br />
        <DateSelector
          currentValue={currentDateEntry(currentDay, timeGroupingMode)}
          nextValue={nextDateEntry(currentDay, timeGroupingMode)}
          previousValue={prevDateEntry(currentDay, timeGroupingMode)}
          onPreviousClick={goToPrevDate}
          onNextClick={goToNextDate}
        />
      <EventListView textOnly={textOnly} events={events}/>
    </div>
  )
}

export default EventListViewManager;
