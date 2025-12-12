import React from 'react';
import moment from 'moment';
import MapView from './MapView'
import EventListView from './EventListView'
import AIResearchModal from './AIResearchModal';
import EventModal from './EventModal';
import { API_CONFIG } from '../config';
import _ from 'underscore'

const FILE_DATE_FORMAT = 'MM-DD';
const SINGLE_DAY_FORMAT = 'M/DD (dddd)'

export default class MapViewManager extends React.Component {
  constructor(props) {
    super(props)
    const currentDay = moment(new Date());
    const allEvents = props.events || [];
    const venues = props.venues || [];
    this.state = {
      allEvents: allEvents,
      venues: venues,
      events: this.computeEventsList(allEvents, currentDay),
      currentDay: currentDay,
      // Event Modal state
      showEventModal: false,
      selectedEvent: null,
      // AI Modal state
      showAIModal: false,
      currentEvent: null,
      quickSummary: '',
      aiContent: '',
      aiLoading: false,
      aiError: null,
      aiProofreading: false,
      aiDrafting: false,
      detailedLoading: false,
      artistList: [],
      artistResults: {},
      artistProgress: {},
    };

    this.artistProgressTimers = {};
    this.handleEventClick = this.handleEventClick.bind(this);
    this.closeEventModal = this.closeEventModal.bind(this);
    this.handleAIClick = this.handleAIClick.bind(this);
    this.handleDetailedResearch = this.handleDetailedResearch.bind(this);
    this.closeAIModal = this.closeAIModal.bind(this);
  }

  componentDidMount() {
    // Expose console command to list all venues without location
    window.listMissingVenues = () => {
      const allEvents = this.state.allEvents || {};
      const venues = this.state.venues || [];

      const venueMap = {};
      venues.forEach(venue => {
        venueMap[venue.name] = venue;
      });

      const missingVenueNames = new Set();

      Object.values(allEvents).forEach(dateEvents => {
        dateEvents.forEach(event => {
          const venueName = event.source.name;
          const venueCommonName = event.source.commonName;

          // Check if venue has override location
          const VENUE_LOCATION_OVERRIDES = require('../venueLocationOverrides').VENUE_LOCATION_OVERRIDES;
          const override = VENUE_LOCATION_OVERRIDES.find(o => o.lookup(venueCommonName));
          if (override) {
            return; // Has override
          }

          // Check venues.json
          const venue = venueMap[venueName];
          if (!venue || !venue.latlng) {
            missingVenueNames.add(venueCommonName);
          }
        });
      });

      const sortedNames = Array.from(missingVenueNames).sort();
      console.log(`\n=== ${sortedNames.length} Venues Without Location ===\n`);
      sortedNames.forEach(name => console.log(`"${name}"`));
      console.log('\n');

      return sortedNames;
    };

    console.log('Console command available: listMissingVenues()');
  }

  componentWillUnmount() {
    delete window.listMissingVenues;
    this.clearArtistProgress();
    if (this.eventSource) this.eventSource.close();
    if (this.detailedEventSource) this.detailedEventSource.close();
    if (this.quickSummaryTimeout) clearTimeout(this.quickSummaryTimeout);
  }

  componentDidUpdate(oldProps) {
    if (this.props.events != oldProps.events || this.props.venues != oldProps.venues) {
      this.setState({
        ...this.state,
        allEvents: this.props.events,
        venues: this.props.venues,
        events: this.computeEventsList(this.props.events, this.state.currentDay)
      })
    }
  }

  computeEventsList(allEvents, currentDay) {
    return _.pick(allEvents, currentDay.format(FILE_DATE_FORMAT));
  }

  currentDateEntry() {
    return this.state.currentDay.format(SINGLE_DAY_FORMAT)
  }

  nextDateEntry() {
    return this.state.currentDay.clone().add(1, 'days').format(SINGLE_DAY_FORMAT)
  }

  prevDateEntry() {
    return this.state.currentDay.clone().add(-1, 'days').format(SINGLE_DAY_FORMAT)
  }

  goToNextDate() {
    const newDay = this.state.currentDay.clone().add(1, 'days');
    this.setState({...this.state, currentDay: newDay, events: this.computeEventsList(this.state.allEvents, newDay)})
  }

  goToPrevDate() {
    const newDay = this.state.currentDay.clone().add(-1, 'days');
    this.setState({...this.state, currentDay: newDay, events: this.computeEventsList(this.state.allEvents, newDay)})
  }

  handleEventClick(event) {
    this.setState({
      showEventModal: true,
      selectedEvent: event
    });
  }

  closeEventModal() {
    this.setState({
      showEventModal: false,
      selectedEvent: null
    });
  }

  handleAIClick(event, forceRefetch = false) {
    const quickCacheKey = this.cacheKey(event, 'quick');
    const detailedCacheKey = this.cacheKey(event, 'detailed');

    if (!forceRefetch) {
      const quickCached = localStorage.getItem(quickCacheKey);
      const detailedCached = localStorage.getItem(detailedCacheKey);

      if (quickCached) {
        try {
          const quickParsed = JSON.parse(quickCached);
          const quickSummary = quickParsed.quickSummary || '';

          let detailedContent = '';
          if (detailedCached) {
            try {
              const detailedParsed = JSON.parse(detailedCached);
              detailedContent = detailedParsed.aiContent || '';
            } catch (e) {
              console.warn('AI detailed cache parse failed', e);
            }
          }

          this.setState({
            showAIModal: true,
            currentEvent: event,
            quickSummary: quickSummary,
            aiContent: detailedContent,
            aiLoading: false,
            aiError: null,
            detailedLoading: false,
          });
          return;
        } catch (e) {
          console.warn('AI quick cache parse failed', e);
        }
      }
    } else {
      this.clearCache(quickCacheKey);
      this.clearCache(detailedCacheKey);
    }

    this.setState({
      showAIModal: true,
      currentEvent: event,
      quickSummary: '',
      aiContent: '',
      aiLoading: true,
      aiError: null,
      detailedLoading: false,
    });

    if (API_CONFIG.USE_SAMPLE_DATA) {
      this.setState({
        quickSummary: 'This is a sample quick summary for testing.',
        aiLoading: false
      });
    } else {
      const params = new URLSearchParams({
        date: event.date,
        title: event.title,
        venue: event.source.commonName,
        url: event.url,
        mode: 'quick'
      });

      const eventSource = new EventSource(
        `${API_CONFIG.CONCERT_RESEARCH_ENDPOINT}?${params.toString()}`
      );

      eventSource.onmessage = null;

      eventSource.addEventListener('quick', (e) => {
        this.setState(prevState => ({
          quickSummary: prevState.quickSummary + e.data,
          aiLoading: false
        }));
      });

      eventSource.onerror = (err) => {
        eventSource.close();
        if (this.quickSummaryTimeout) {
          clearTimeout(this.quickSummaryTimeout);
          this.quickSummaryTimeout = null;
        }

        this.setState((prev) => {
          if (prev.quickSummary && prev.quickSummary.trim().length > 0) {
            setTimeout(() => this.handleDetailedResearch(), 100);
            return { aiLoading: false };
          }
          return {
            aiLoading: false,
            aiError: 'Failed to connect. Please try again.'
          };
        });
      };

      this.quickSummaryTimeout = setTimeout(() => {
        eventSource.close();
        const cacheData = { quickSummary: this.state.quickSummary };
        localStorage.setItem(quickCacheKey, JSON.stringify(cacheData));
        this.handleDetailedResearch();
      }, 10000);

      this.eventSource = eventSource;
    }
  }

  handleDetailedResearch() {
    const event = this.state.currentEvent;
    if (!event) return;

    const detailedCacheKey = this.cacheKey(event, 'detailed');

    if (this.detailedEventSource) {
      return;
    }

    const cached = localStorage.getItem(detailedCacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        this.setState({
          aiContent: parsed.aiContent || '',
          detailedLoading: false,
          aiProofreading: false,
          aiDrafting: false,
        });
        return;
      } catch (e) {
        console.warn('AI detailed cache parse failed', e);
      }
    }

    this.setState({
      aiContent: '',
      detailedLoading: true,
      aiProofreading: false,
      aiDrafting: true,
    });

    if (API_CONFIG.USE_SAMPLE_DATA) {
      this.setState({
        aiContent: 'Sample detailed research content.',
        detailedLoading: false,
        aiDrafting: false,
      });
    } else {
      const params = new URLSearchParams({
        date: event.date,
        title: event.title,
        venue: event.source.commonName,
        url: event.url,
        mode: 'detailed'
      });

      const eventSource = new EventSource(
        `${API_CONFIG.CONCERT_RESEARCH_ENDPOINT}?${params.toString()}`
      );

      eventSource.onmessage = null;

      eventSource.addEventListener('status', (e) => {
        if (e.data === 'extracting_artists') {
          this.setState({ detailedLoading: true, aiDrafting: true });
        } else if (e.data === 'researching_artists') {
          this.setState({ aiProofreading: true, aiDrafting: false });
        }
      });

      eventSource.addEventListener('artist_list', (e) => {
        const artistList = JSON.parse(e.data);
        this.startArtistProgress(artistList);

        const placeholders = artistList.map(artist =>
          `### ${artist}\n- **YouTube**: Loading...\n- **Genres**: Loading...\n- **Bio**: Loading...`
        ).join('\n\n');

        this.setState({
          artistList: artistList,
          artistResults: {},
          artistProgress: artistList.reduce((acc, name) => ({ ...acc, [name]: 0 }), {}),
          aiContent: placeholders,
          detailedLoading: false,
          aiDrafting: false,
        });
      });

      eventSource.addEventListener('artist_result', (e) => {
        const resultData = JSON.parse(e.data);
        const { artist, content } = resultData;

        this.stopArtistProgress(artist);

        this.setState(prevState => {
          const newResults = { ...prevState.artistResults, [artist]: content };
          const { [artist]: _, ...remainingProgress } = prevState.artistProgress;

          const orderedContent = prevState.artistList.map(artistName => {
            if (newResults[artistName]) {
              return newResults[artistName];
            } else {
              return `### ${artistName}\n- **YouTube**: Loading...\n- **Genres**: Loading...\n- **Bio**: Loading...`;
            }
          }).join('\n\n');

          return {
            artistResults: newResults,
            artistProgress: remainingProgress,
            aiContent: orderedContent
          };
        });
      });

      eventSource.addEventListener('complete', (e) => {
        this.setState({
          detailedLoading: false,
          aiProofreading: false,
          aiDrafting: false
        }, () => {
          const cacheData = { aiContent: this.state.aiContent };
          localStorage.setItem(detailedCacheKey, JSON.stringify(cacheData));
        });
        this.clearArtistProgress();
        eventSource.close();
      });

      eventSource.onerror = (err) => {
        eventSource.close();
        this.setState({ detailedLoading: false, aiProofreading: false, aiDrafting: false });
      };

      setTimeout(() => eventSource.close(), 300000);
      this.detailedEventSource = eventSource;
    }
  }

  cacheKey(event, mode = 'quick') {
    return `aiCache:${mode}:${event.date}:${event.source.commonName}:${event.title}`;
  }

  clearCache(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('AI cache clear failed', e);
    }
  }

  startArtistProgress(artistList) {
    this.clearArtistProgress();
    const durationMs = 20000;

    artistList.forEach((artist) => {
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
        this.setState(prev => ({
          artistProgress: { ...prev.artistProgress, [artist]: pct }
        }));
        if (elapsed >= durationMs) {
          this.stopArtistProgress(artist);
        }
      };

      tick();
      this.artistProgressTimers[artist] = setInterval(tick, 300);
    });
  }

  stopArtistProgress(artist) {
    const timer = this.artistProgressTimers[artist];
    if (timer) {
      clearInterval(timer);
      delete this.artistProgressTimers[artist];
    }
  }

  clearArtistProgress() {
    Object.values(this.artistProgressTimers).forEach(clearInterval);
    this.artistProgressTimers = {};
    this.setState({ artistProgress: {} });
  }

  closeAIModal() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.detailedEventSource) {
      this.detailedEventSource.close();
      this.detailedEventSource = null;
    }
    if (this.quickSummaryTimeout) {
      clearTimeout(this.quickSummaryTimeout);
      this.quickSummaryTimeout = null;
    }

    this.setState({
      showAIModal: false,
      currentEvent: null,
      quickSummary: '',
      aiContent: '',
      aiError: null,
      aiDrafting: false,
      aiProofreading: false,
      aiLoading: false,
      detailedLoading: false,
      artistList: [],
      artistResults: {},
      artistProgress: {},
    });
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
          (this.state.allEvents.length == 0) ? (
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

        <AIResearchModal
          isOpen={this.state.showAIModal}
          onClose={this.closeAIModal}
          quickSummary={this.state.quickSummary}
          content={this.state.aiContent}
          loading={this.state.aiLoading}
          error={this.state.aiError}
          proofreading={this.state.aiProofreading}
          drafting={this.state.aiDrafting}
          detailedLoading={this.state.detailedLoading}
          artistList={this.state.artistList}
          artistResults={this.state.artistResults}
          artistProgress={this.state.artistProgress}
          onRefetch={() => this.handleAIClick(this.state.currentEvent, true)}
          onGetDetails={this.handleDetailedResearch}
        />
      </div>
    )
  }
}
