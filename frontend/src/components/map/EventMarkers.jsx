import React, { useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import mapPinIcon from './MapPinIcon';
import MapImageMarker from './MapImageMarker';

const PinMarker = ({ map, event, onEventClick, onEventHover }) => {
  const markerRef = useRef(null);

  React.useEffect(() => {
    if (!map) return;
    const pinMarker = L.marker([event.lat, event.lng], {
      icon: mapPinIcon,
      zIndexOffset: 1000,
    });
    pinMarker.on('click', () => onEventClick(event));
    pinMarker.on('mouseover', () => onEventHover(event));
    pinMarker.on('mouseout', () => onEventHover(null));
    pinMarker.addTo(map);
    markerRef.current = pinMarker;

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, event, onEventClick, onEventHover]);

  return null;
};

const EventMarkers = ({ events, onEventClick, onEventHover, currentZoom }) => {
  const map = useMap();
  return (
    <>
      {events.map((event, index) => (
        <React.Fragment key={`${event.source.name}-${event.title}-${event.date}-${index}`}>
          <MapImageMarker
            map={map}
            event={event}
            currentZoom={currentZoom}
            onEventClick={onEventClick}
            onEventHover={onEventHover}
          />
          <PinMarker
            map={map}
            event={event}
            onEventClick={onEventClick}
            onEventHover={onEventHover}
          />
        </React.Fragment>
      ))}
    </>
  );
};

export default EventMarkers;
