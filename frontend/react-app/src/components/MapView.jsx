import React from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import EventMapCard from './EventMapCard';
import EventListView from './EventListView';
import { VENUE_LOCATION_OVERRIDES } from '../venueLocationOverrides';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const BAY_AREA_CENTER = [37.7749, -122.4194]; // San Francisco
const DEFAULT_ZOOM = 10;

// Zoom scaling configuration
const CARD_ZOOM_THRESHOLD = 11; // Show cards at zoom 11 and above, only markers below
const MIN_ZOOM = 11;
const MAX_ZOOM = 16;
const MIN_SCALE = 0.2;
const MAX_SCALE = 0.9;

// Image size - largest dimension will be clamped to this value
const BASE_SIZE = 120;

function calculateScale(zoom) {
  if (zoom <= MIN_ZOOM) return MIN_SCALE;
  if (zoom >= MAX_ZOOM) return MAX_SCALE;

  // Linear interpolation between MIN_SCALE and MAX_SCALE
  const range = MAX_ZOOM - MIN_ZOOM;
  const position = zoom - MIN_ZOOM;
  const scaleRange = MAX_SCALE - MIN_SCALE;

  return MIN_SCALE + (position / range) * scaleRange;
}

function EventMarkers({ events, onEventClick, currentZoom }) {
  const map = useMap();
  const markersRef = React.useRef([]);

  React.useEffect(() => {
    // Clear existing markers
    markersRef.current.forEach(marker => {
      map.removeLayer(marker);
    });
    markersRef.current = [];

    events.forEach((event) => {
      // First add the image card (lower z-index)
      const scale = calculateScale(currentZoom);
      const scaledSize = BASE_SIZE * scale;

      const iconHtml = renderToStaticMarkup(
        <EventMapCard event={event} />
      );

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-marker-icon',
        iconSize: [scaledSize, scaledSize],
        // Center the image at the marker point
        iconAnchor: [scaledSize / 2, scaledSize / 2],
      });

      const cardMarker = L.marker([event.lat, event.lng], {
        icon: customIcon,
        interactive: true,
        zIndexOffset: -1000
      });

      // Click on card opens event modal
      cardMarker.on('click', () => {
        onEventClick(event);
      });

      cardMarker.addTo(map);
      markersRef.current.push(cardMarker);

      // Then add the pin marker on top (higher z-index)
      const pinMarker = L.marker([event.lat, event.lng], {
        zIndexOffset: 1000
      });

      // Click on marker opens event modal
      pinMarker.on('click', () => {
        onEventClick(event);
      });

      pinMarker.addTo(map);
      markersRef.current.push(pinMarker);
    });

    return () => {
      markersRef.current.forEach(marker => {
        map.removeLayer(marker);
      });
      markersRef.current = [];
    };
  }, [events, currentZoom, map, onEventClick]);

  return null;
}

function ZoomHandler({ onZoomChange }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });
  return null;
}

export default class MapView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentZoom: DEFAULT_ZOOM,
      showMissingEventsModal: false,
    };
    // Cache computed values - each method tracks its own props
    this.cachedEventsWithLocation = null;
    this.lastPropsEventsForWithLocation = null;
    this.lastPropsVenuesForWithLocation = null;

    this.cachedEventsWithoutLocation = null;
    this.lastPropsEventsForWithoutLocation = null;
    this.lastPropsVenuesForWithoutLocation = null;

    this.cachedTotalEvents = null;
    this.lastPropsEventsForTotal = null;
  }

  parseLatLng(latlngStr) {
    if (!latlngStr) return null;
    const parts = latlngStr.split(',').map(s => parseFloat(s.trim()));
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
    return parts; // [lat, lng]
  }

  getEventsWithLocation() {
    // Return cached result if props haven't changed
    if (this.cachedEventsWithLocation &&
        this.lastPropsEventsForWithLocation === this.props.events &&
        this.lastPropsVenuesForWithLocation === this.props.venues) {
      return this.cachedEventsWithLocation;
    }

    const events = this.props.events || {};
    const venues = this.props.venues || [];

    // Create a map of venue name -> venue data for quick lookup
    const venueMap = {};
    venues.forEach(venue => {
      venueMap[venue.name] = venue;
    });

    // Flatten all events for the day and filter those with lat/lng
    const eventsWithLocation = [];
    Object.entries(events).forEach(([date, dateEvents]) => {
      dateEvents.forEach(event => {
        const venueName = event.source.name;
        const venueCommonName = event.source.commonName;

        // Check override file first (using commonName for List venues)
        let coords = null;
        if (VENUE_LOCATION_OVERRIDES[venueCommonName]) {
          coords = this.parseLatLng(VENUE_LOCATION_OVERRIDES[venueCommonName]);
        } else {
          // Fall back to venues.json data (using name)
          const venue = venueMap[venueName];
          if (venue && venue.latlng) {
            coords = this.parseLatLng(venue.latlng);
          }
        }

        if (coords) {
          eventsWithLocation.push({
            ...event,
            lat: coords[0],
            lng: coords[1],
            date: date
          });
        }
      });
    });

    // Cache the result
    this.cachedEventsWithLocation = eventsWithLocation;
    this.lastPropsEventsForWithLocation = this.props.events;
    this.lastPropsVenuesForWithLocation = this.props.venues;

    return eventsWithLocation;
  }

  handleZoomChange = (zoom) => {
    this.setState({ currentZoom: zoom });
  }

  getTotalEventCount() {
    // Return cached result if props haven't changed
    if (this.cachedTotalEvents !== null &&
        this.lastPropsEventsForTotal === this.props.events) {
      return this.cachedTotalEvents;
    }

    const events = this.props.events || {};
    let total = 0;
    Object.values(events).forEach(dateEvents => {
      total += dateEvents.length;
    });

    this.cachedTotalEvents = total;
    this.lastPropsEventsForTotal = this.props.events;
    return total;
  }

  getEventsWithoutLocation() {
    // Return cached result if props haven't changed
    if (this.cachedEventsWithoutLocation &&
        this.lastPropsEventsForWithoutLocation === this.props.events &&
        this.lastPropsVenuesForWithoutLocation === this.props.venues) {
      return this.cachedEventsWithoutLocation;
    }

    const events = this.props.events || {};
    const venues = this.props.venues || [];

    const venueMap = {};
    venues.forEach(venue => {
      venueMap[venue.name] = venue;
    });

    const eventsWithoutLocation = {};
    Object.entries(events).forEach(([date, dateEvents]) => {
      const eventsForDate = dateEvents.filter(event => {
        const venueName = event.source.name;
        const venueCommonName = event.source.commonName;

        // Check if venue has override location (using commonName for List venues)
        if (VENUE_LOCATION_OVERRIDES[venueCommonName]) {
          const coords = this.parseLatLng(VENUE_LOCATION_OVERRIDES[venueCommonName]);
          if (coords) return false; // Has location via override
        }

        // Check venues.json (using name)
        const venue = venueMap[venueName];
        if (!venue || !venue.latlng) return true;
        const coords = this.parseLatLng(venue.latlng);
        return !coords;
      });

      if (eventsForDate.length > 0) {
        eventsWithoutLocation[date] = eventsForDate;
      }
    });

    this.cachedEventsWithoutLocation = eventsWithoutLocation;
    this.lastPropsEventsForWithoutLocation = this.props.events;
    this.lastPropsVenuesForWithoutLocation = this.props.venues;
    return eventsWithoutLocation;
  }

  openMissingEventsModal = () => {
    this.setState({ showMissingEventsModal: true });
  }

  closeMissingEventsModal = () => {
    this.setState({ showMissingEventsModal: false });
  }

  render() {
    const eventsWithLocation = this.getEventsWithLocation();
    const eventsWithoutLocationByDate = this.getEventsWithoutLocation();

    // Count total events without location across all dates
    let eventsWithoutLocationCount = 0;
    Object.values(eventsWithoutLocationByDate).forEach(dateEvents => {
      eventsWithoutLocationCount += dateEvents.length;
    });

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
          <ZoomHandler onZoomChange={this.handleZoomChange} />
          <EventMarkers
            events={eventsWithLocation}
            onEventClick={this.props.onEventClick}
            currentZoom={this.state.currentZoom}
          />
        </MapContainer>
        {eventsWithoutLocationCount > 0 && (
          <div className='map-events-missing-notice' onClick={this.openMissingEventsModal}>
            {eventsWithoutLocationCount} event{eventsWithoutLocationCount !== 1 ? 's' : ''} not shown on map (no location registered for venue)
          </div>
        )}
        {this.state.showMissingEventsModal && (
          <div className='missing-events-modal-overlay' onClick={this.closeMissingEventsModal}>
            <div className='missing-events-modal-content' onClick={(e) => e.stopPropagation()}>
              <button className='event-modal-close' onClick={this.closeMissingEventsModal}>×</button>
              <h2>Events Without Location Data</h2>
              <EventListView textOnly={true} events={eventsWithoutLocationByDate} />
            </div>
          </div>
        )}
      </div>
    );
  }
}
