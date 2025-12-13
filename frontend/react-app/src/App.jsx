import './App.css';

import React, { useEffect } from 'react';
import 'bulma/css/bulma.min.css';

import Nav from './components/Nav';
import EventListViewManager from './components/EventListViewManager';
import MapViewManager from './components/MapViewManager';
import AboutView from './components/AboutView';
import VenuesList from './components/VenuesList';
import GcsDataLoader from "./utils/GcsDataLoader"
import AIResearchModal from './components/ai_research/AIResearchModal';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { eventsState, venuesState } from './state/atoms';

function App({ route }) {
  const setEvents = useSetRecoilState(eventsState);
  const setVenues = useSetRecoilState(venuesState);
  const events = useRecoilValue(eventsState);

  useEffect(() => {
    const fetchJsonData = async () => {
      const venues = await GcsDataLoader.loadVenueData();
      const events = await GcsDataLoader.loadEventData(venues);
      setVenues(venues);
      setEvents(events);
    };

    fetchJsonData();
  }, []);

  const hasEvents = Object.keys(events || {}).length > 0;
  const loadingMessage = <div className='loading'>Loading months and months of show listings. Give it just a few seconds ...</div>;

  let currentView;
  if (route === "TextAndImagesView") {
    currentView = hasEvents ? <EventListViewManager /> : loadingMessage;
  }
  if (route === "TextView") {
    currentView = hasEvents ? <EventListViewManager textOnly={true} /> : loadingMessage;
  }
  if (route === "MapView") { currentView = <MapViewManager />; }
  if (route === "VenuesListView") { currentView = <VenuesList />; }
  if (route === "About") { currentView = <AboutView />; }

  return (
      <div className="App-body">
        <div className="App-body-content">
          <Nav route={route} />
          {currentView}
          <AIResearchModal />
        </div>
      </div>
  );
}

export { App }
