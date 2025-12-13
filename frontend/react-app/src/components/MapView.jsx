import React, { useCallback, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import EventListView from './EventListView';
import { VENUE_LOCATION_OVERRIDES } from '../venueLocationOverrides';
import mapPinIcon from './map/MapPinIcon';
import { parseLatLng, BAY_AREA_CENTER, DEFAULT_ZOOM } from '../utils/mapUtils';
import { buildEventCardIcon } from './map/MapEventIcon';

function EventMarkers({ events, onEventClick, onEventHover, currentZoom }) {
  const map = useMap();
  const markersRef = useRef([]);

  React.useEffect(() => {
    markersRef.current.forEach((marker) => {
      map.removeLayer(marker);
    });
    markersRef.current = [];

    events.forEach((event) => {
      const customIcon = buildEventCardIcon(event, currentZoom);

      const cardMarker = L.marker([event.lat, event.lng], {
        icon: customIcon,
        interactive: true,
        zIndexOffset: -1000,
      });

      cardMarker.on('click', () => onEventClick(event));
      cardMarker.on('mouseover', () => onEventHover(event));
      cardMarker.on('mouseout', () => onEventHover(null));

      cardMarker.addTo(map);
      markersRef.current.push(cardMarker);

      const pinMarker = L.marker([event.lat, event.lng], {
        icon: mapPinIcon,
        zIndexOffset: 1000,
      });

      pinMarker.on('click', () => onEventClick(event));
      pinMarker.on('mouseover', () => onEventHover(event));
      pinMarker.on('mouseout', () => onEventHover(null));

      pinMarker.addTo(map);
      markersRef.current.push(pinMarker);
    });

    return () => {
      markersRef.current.forEach((marker) => map.removeLayer(marker));
      markersRef.current = [];
    };
  }, [events, currentZoom, map, onEventClick, onEventHover]);

  return null;
}

function ZoomHandler({ onZoomChange }) {
  useMapEvents({
    zoomend: (e) => {
      onZoomChange(e.target.getZoom());
    },
  });
  return null;
}

const MapView = ({ events = {}, venues = [], onEventClick }) => {
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);
  const [showMissingEventsModal, setShowMissingEventsModal] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState(null);

  const venueMap = useMemo(() => {
    const map = {};
    venues.forEach((venue) => { map[venue.name] = venue; });
    return map;
  }, [venues]);

  const eventsWithLocation = useMemo(() => {
    const list = [];
    Object.values(events || {}).forEach((dateEvents = []) => {
      dateEvents.forEach((event) => {
        const venueName = event.source.name;
        const venueCommonName = event.source.commonName;

        let coords = null;
        const override = VENUE_LOCATION_OVERRIDES.find(([substrings]) =>
          substrings.every((substring) => venueCommonName.includes(substring))
        );
        if (override) {
          coords = parseLatLng(override[1]);
        } else {
          const venue = venueMap[venueName];
          if (venue && venue.latlng) {
            coords = parseLatLng(venue.latlng);
          }
        }

        if (coords) {
          list.push({ ...event, lat: coords[0], lng: coords[1] });
        }
      });
    });
    return list;
  }, [events, venueMap]);

  const eventsWithoutLocationByDate = useMemo(() => {
    const result = {};
    Object.entries(events || {}).forEach(([date, dateEvents]) => {
      const missing = dateEvents.filter((event) => {
        const venueName = event.source.name;
        const venueCommonName = event.source.commonName;

        const override = VENUE_LOCATION_OVERRIDES.find(([substrings]) =>
          substrings.every((substring) => venueCommonName.includes(substring))
        );
        if (override) {
          const coords = parseLatLng(override[1]);
          if (coords) return false;
        }

        const venue = venueMap[venueName];
        if (!venue || !venue.latlng) return true;
        const coords = parseLatLng(venue.latlng);
        return !coords;
      });

      if (missing.length > 0) {
        result[date] = missing;
      }
    });
    return result;
  }, [events, venueMap]);

  const eventsWithoutLocationCount = useMemo(
    () => Object.values(eventsWithoutLocationByDate).reduce((acc, dateEvents) => acc + dateEvents.length, 0),
    [eventsWithoutLocationByDate]
  );

  const handleZoomChange = useCallback((zoom) => setCurrentZoom(zoom), []);
  const handleEventHover = useCallback((event) => setHoveredEvent(event), []);

  if (eventsWithLocation.length === 0) {
    return (
      <div className='map-container'>
        <div className='map-no-events'>
          No events with location data for this day.
        </div>
      </div>
    );
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
        <ZoomHandler onZoomChange={handleZoomChange} />
        <EventMarkers
          events={eventsWithLocation}
          onEventClick={onEventClick}
          onEventHover={handleEventHover}
          currentZoom={currentZoom}
        />
      </MapContainer>
      {hoveredEvent && (
        <div className='map-hover-info-box'>
          <div className='map-hover-venue'>{hoveredEvent.source.commonName || hoveredEvent.source.name}</div>
          <div className='map-hover-title'>{hoveredEvent.title}</div>
        </div>
      )}
      {eventsWithoutLocationCount > 0 && (
        <div className='map-events-missing-notice' onClick={() => setShowMissingEventsModal(true)}>
          {eventsWithoutLocationCount} event{eventsWithoutLocationCount !== 1 ? 's' : ''} not shown on map (no location registered for venue)
        </div>
      )}
      {showMissingEventsModal && (
        <div className='missing-events-modal-overlay' onClick={() => setShowMissingEventsModal(false)}>
          <div className='missing-events-modal-content' onClick={(e) => e.stopPropagation()}>
            <button className='event-modal-close' onClick={() => setShowMissingEventsModal(false)}>×</button>
            <h2>Events Without Location Data</h2>
            <EventListView textOnly={true} events={eventsWithoutLocationByDate} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
