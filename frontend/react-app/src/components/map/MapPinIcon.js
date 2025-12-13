import L from 'leaflet';

// Shared custom marker icon (lime green and black)
const mapPinIcon = L.divIcon({
  html: '<div class="custom-map-pin"></div>',
  className: 'custom-pin-icon',
  iconSize: [12, 30],
  iconAnchor: [6, 30],
  popupAnchor: [0, -30],
});

export default mapPinIcon;

