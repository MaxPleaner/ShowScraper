import React, { useMemo, useState } from 'react';
import { Columns, Box } from 'react-bulma-components';
const { Column } = Columns;
import EventListView from '../event_list/EventListView'
import { useRecoilState, useRecoilValue } from 'recoil';
import * as Atoms from '../../state/atoms';
import * as DateUtils from '../../utils/dateUtils';
import { filterEventsList } from '../../utils/eventFilterUtils';
import AiIntegrationNotice from '../header/AiIntegrationNotice';
import OtherEventLists from '../header/OtherEventLists';
import SearchVenuesForm from '../event_list/SearchVenuesForm';
import DateSelector from '../event_list/DateSelector';

// This handles filtering the event list using dates and search.
// It calls EventListView which performs the actual rendering (either text or flyer)
const EventListViewManager = ({ textOnly }) => {
  const eventsFromStore = useRecoilValue(Atoms.eventsState);
  const [currentDay, setCurrentDay] = useRecoilState(Atoms.currentDayState);
  const [timeGroupingMode] = useRecoilState(Atoms.timeGroupingModeState);
  const [search, setSearch] = useState("");

  const events = useMemo(
    () => filterEventsList(eventsFromStore || {}, currentDay, timeGroupingMode, search),
    [eventsFromStore, currentDay, timeGroupingMode, search]
  );

  return (
    <div className='ListViewManager'>
        <AiIntegrationNotice />
        <br />
        <OtherEventLists />
        <br />
        <DateSelector
          currentValue={DateUtils.currentDateEntry(currentDay, timeGroupingMode)}
          nextValue={DateUtils.nextDateEntry(currentDay, timeGroupingMode)}
          previousValue={DateUtils.prevDateEntry(currentDay, timeGroupingMode)}
          onPreviousClick={() => setCurrentDay(prev => DateUtils.prevDate(prev, timeGroupingMode))}
          onNextClick={() => setCurrentDay(prev => DateUtils.nextDate(prev, timeGroupingMode))}
        />
        <SearchVenuesForm onChange={(event) => setSearch(event.currentTarget.value)} />
      <EventListView textOnly={textOnly} events={events}/>
    </div>
  )
}

export default EventListViewManager;
