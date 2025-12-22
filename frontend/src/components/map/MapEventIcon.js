import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import EventMapCard from './EventMapCard';
import { calculateScale, BASE_SIZE } from '../../utils/mapUtils';

// Builds the leaflet divIcon for an event card, scaled to the current zoom.
export function buildEventCardIcon(event, currentZoom) {
  const scale = calculateScale(currentZoom);
  const scaledSize = BASE_SIZE * scale;

  const iconHtml = renderToStaticMarkup(<EventMapCard event={event} />);

  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker-icon',
    iconSize: [scaledSize, scaledSize],
    iconAnchor: [scaledSize / 2, scaledSize / 2],
  });
}

export default buildEventCardIcon;
