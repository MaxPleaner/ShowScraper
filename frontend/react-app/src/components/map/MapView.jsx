import React, { useState } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import EventMarkers from './EventMarkers';
import HoverInfoBox from './HoverInfoBox';
import MissingEventsNotice from './MissingEventsNotice';
import MissingEventsModal from './MissingEventsModal';
import NoMapEntries from './NoMapEntries';
import { BAY_AREA_CENTER, DEFAULT_ZOOM } from '../../utils/mapUtils';
import useVenues from '../../hooks/useVenues';

const MapView = ({ events = {}, onEventClick }) => {
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);
  const [showMissingEventsModal, setShowMissingEventsModal] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const {
    eventsWithLocation,
    eventsWithoutLocationByDate,
    eventsWithoutLocationCount,
  } = useVenues(events);

  const ZoomHandler = () => {
    useMapEvents({
      zoomend: (e) => setCurrentZoom(e.target.getZoom()),
    });
    return null;
  };

  if (eventsWithLocation.length === 0) {
    return <NoMapEntries />;
  }

  return (
    <div className='map-container'>
      <MapContainer
        center={BAY_AREA_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '600px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomHandler />
        <EventMarkers
          events={eventsWithLocation}
          onEventClick={onEventClick}
          onEventHover={(event) => setHoveredEvent(event)}
          currentZoom={currentZoom}
        />
      </MapContainer>
      <HoverInfoBox event={hoveredEvent} />
      <MissingEventsNotice
        count={eventsWithoutLocationCount}
        onClick={() => setShowMissingEventsModal(true)}
      />
      {showMissingEventsModal && (
        <MissingEventsModal
          onClose={() => setShowMissingEventsModal(false)}
          events={eventsWithoutLocationByDate}
        />
      )}
    </div>
  );
};

export default MapView;
