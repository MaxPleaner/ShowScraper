import React from 'react';
import moment from 'moment';
import _ from 'underscore';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { eventsState, venuesState, aiModalOpenState, aiModalEventState } from '../state/atoms';
import MapView from './MapView';
import EventListView from './EventListView';
import EventModal from './EventModal';
import AIResearchModal from './ai_research/AIResearchModal';

const FILE_DATE_FORMAT = 'MM-DD';
const SINGLE_DAY_FORMAT = 'M/DD (dddd)';

class MapViewManagerInner extends React.Component {
  constructor(props) {
    super(props);
    const currentDay = moment(new Date());
    const allEvents = props.events || [];
    const venues = props.venues || [];
    this.state = {
      allEvents,
      venues,
      events: this.filterEventsList(allEvents, currentDay),
      currentDay,
      showEventModal: false,
      selectedEvent: null,
    };

    this.handleEventClick = this.handleEventClick.bind(this);
    this.closeEventModal = this.closeEventModal.bind(this);
    this.handleAIClick = this.handleAIClick.bind(this);
  }

  componentDidMount() {
    // Expose console command to list all venues without location
    window.listMissingVenues = () => {
      const allEvents = this.state.allEvents || {};
      const venues = this.state.venues || [];

      const venueMap = {};
      venues.forEach((venue) => {
        venueMap[venue.name] = venue;
      });

      const missingVenueNames = new Set();

      Object.values(allEvents).forEach((dateEvents) => {
        dateEvents.forEach((event) => {
          const venueName = event.source.name;
          const venueCommonName = event.source.commonName;

          // Check if venue has override location
          const { VENUE_LOCATION_OVERRIDES } = require('../venueLocationOverrides');
          const override = VENUE_LOCATION_OVERRIDES.find(([substrings]) =>
            substrings.every((substring) => venueCommonName.includes(substring))
          );
          if (override) return; // Has override

          // Check venues.json
          const venue = venueMap[venueName];
          if (!venue || !venue.latlng) {
            missingVenueNames.add(venueCommonName);
          }
        });
      });

      const sortedNames = Array.from(missingVenueNames).sort();
      console.log(`\n=== ${sortedNames.length} Venues Without Location ===\n`);
      sortedNames.forEach((name) => console.log(`"${name}"`));
      console.log('\n');

      return sortedNames;
    };

    console.log('Console command available: listMissingVenues()');
  }

  componentWillUnmount() {
    delete window.listMissingVenues;
  }

  componentDidUpdate(oldProps) {
    if (this.props.events !== oldProps.events || this.props.venues !== oldProps.venues) {
      this.setState({
        ...this.state,
        allEvents: this.props.events,
        venues: this.props.venues,
        events: this.filterEventsList(this.props.events, this.state.currentDay),
      });
    }
  }

  filterEventsList(allEvents, currentDay) {
    return _.pick(allEvents, currentDay.format(FILE_DATE_FORMAT));
  }

  currentDateEntry() {
    return this.state.currentDay.format(SINGLE_DAY_FORMAT);
  }

  nextDateEntry() {
    return this.state.currentDay.clone().add(1, 'days').format(SINGLE_DAY_FORMAT);
  }

  prevDateEntry() {
    return this.state.currentDay.clone().add(-1, 'days').format(SINGLE_DAY_FORMAT);
  }

  goToNextDate() {
    const newDay = this.state.currentDay.clone().add(1, 'days');
    this.setState({
      ...this.state,
      currentDay: newDay,
      events: this.filterEventsList(this.state.allEvents, newDay),
    });
  }

  goToPrevDate() {
    const newDay = this.state.currentDay.clone().add(-1, 'days');
    this.setState({
      ...this.state,
      currentDay: newDay,
      events: this.filterEventsList(this.state.allEvents, newDay),
    });
  }

  handleEventClick(event) {
    this.setState({
      showEventModal: true,
      selectedEvent: event,
    });
  }

  closeEventModal() {
    this.setState({
      showEventModal: false,
      selectedEvent: null,
    });
  }

  handleAIClick(event) {
    const { setAIModalEvent, setAIModalOpen } = this.props;
    if (!event || !setAIModalEvent || !setAIModalOpen) return;
    setAIModalEvent(event);
    setAIModalOpen(true);
  }

  render() {
    return (
      <div className='MapViewManager'>
        <div className='ai-integration-notice'>
          <span className='notice-label'>NOTICE:</span>
          <span> There's now an AI integration. Press the </span>
          <span className='ai-icon-example'>🤖</span>
          <span> icon to attempt to get info about the bands</span>
        </div>
        <br />

        <div className='other-links'>
          <span>Other Event Lists: </span>
          <a href='https://indybay.org/calendar'>Indybay </a> /
          <a href='https://sf.funcheap.com/events/'> FunCheap</a> /
          <a href='https://19hz.info/eventlisting_BayArea.php'> 19hz</a> /
          <a href='https://www.meetup.com/find/?source=EVENTS&eventType=inPerson&sortField=DATETIME&location=us--ca--San%20Francisco&distance=twentyFiveMiles'> Meetup</a>
        </div>

        <br />
        <br />
        <div className='eventDates'>
          <a onClick={this.goToPrevDate.bind(this)}>
            <div className='date-range-select nav-item'>{this.prevDateEntry()}</div>
          </a>

          <div className='date-range-select-static nav-item selected'>{this.currentDateEntry()}</div>

          <a onClick={this.goToNextDate.bind(this)}>
            <div className='date-range-select nav-item'>{this.nextDateEntry()}</div>
          </a>
        </div>

        {
          (this.state.allEvents.length === 0) ? (
            <div className='loading'>Loading months and months of show listings. Give it just a few seconds ...</div>
          ) : (
            <>
              <MapView
                events={this.state.events}
                venues={this.state.venues}
                onEventClick={this.handleEventClick}
              />
              <div className='map-list-divider'>
                <h2>All Events for {this.currentDateEntry()}</h2>
              </div>
              <EventListView textOnly={true} events={this.state.events}/>
            </>
          )
        }

        <EventModal
          isOpen={this.state.showEventModal}
          event={this.state.selectedEvent}
          onClose={this.closeEventModal}
          onAIClick={this.handleAIClick}
        />

        <AIResearchModal />
      </div>
    );
  }
}

const MapViewManager = (props) => {
  const events = useRecoilValue(eventsState);
  const venues = useRecoilValue(venuesState);
  const setAIModalOpen = useSetRecoilState(aiModalOpenState);
  const setAIModalEvent = useSetRecoilState(aiModalEventState);
  return (
    <MapViewManagerInner
      {...props}
      events={events}
      venues={venues}
      setAIModalOpen={setAIModalOpen}
      setAIModalEvent={setAIModalEvent}
    />
  );
};

export default MapViewManager;
