import { useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import EventMapCard from './EventMapCard';
import { calculateScale, BASE_SIZE } from '../../utils/mapUtils';

// Renders a Leaflet marker for the event card and handles cleanup.
const MapImageMarker = ({ map, event, currentZoom, onEventClick, onEventHover }) => {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    const scale = calculateScale(currentZoom);
    const scaledSize = BASE_SIZE * scale;
    const iconHtml = renderToStaticMarkup(<EventMapCard event={event} />);

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-marker-icon',
      iconSize: [scaledSize, scaledSize],
      iconAnchor: [scaledSize / 2, scaledSize / 2],
    });

    const cardMarker = L.marker([event.lat, event.lng], {
      icon: customIcon,
      interactive: true,
      zIndexOffset: -1000,
    });

    cardMarker.on('click', () => onEventClick(event));
    cardMarker.on('mouseover', () => onEventHover(event));
    cardMarker.on('mouseout', () => onEventHover(null));

    cardMarker.addTo(map);
    markerRef.current = cardMarker;

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, event, currentZoom, onEventClick, onEventHover]);

  return null;
};

export default MapImageMarker;
