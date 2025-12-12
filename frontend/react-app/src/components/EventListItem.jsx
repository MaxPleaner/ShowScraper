import React, {useState} from 'react';
import MissingImage from '../MissingImage.png'
import moment from 'moment';
import AIResearchModal from './AIResearchModal';
import { API_CONFIG } from '../config';

export default class EventListItem extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      display: 'none',
      showAIModal: false,
      quickSummary: '',
      aiContent: '',
      aiLoading: false,
      aiError: null,
      aiProofreading: false,
      aiDrafting: false,
      detailedLoading: false,
      artistList: [],
      artistResults: {}, // Map of artist name -> content
      artistProgress: {}, // Map of artist name -> percent 0-100
    }

    this.artistProgressTimers = {};

    this.mouseEnter = this.mouseEnter.bind(this);
    this.mouseLeave = this.mouseLeave.bind(this);
    this.click = this.click.bind(this);
    this.handleAIResearch = this.handleAIResearch.bind(this);
    this.handleDetailedResearch = this.handleDetailedResearch.bind(this);
    this.closeAIModal = this.closeAIModal.bind(this);
    this.startArtistProgress = this.startArtistProgress.bind(this);
    this.stopArtistProgress = this.stopArtistProgress.bind(this);
    this.clearArtistProgress = this.clearArtistProgress.bind(this);
  }

  componentWillUnmount() {
    this.clearArtistProgress();
    if (this.eventSource) this.eventSource.close();
    if (this.detailedEventSource) this.detailedEventSource.close();
    if (this.quickSummaryTimeout) clearTimeout(this.quickSummaryTimeout);
  }

  /////////////////////////////////////////////////////////// 
  // Some complexity in all this due to mouseover handling //
  // on mobile vs web.                                     //
  ///////////////////////////////////////////////////////////

  // Affects web only
  mouseEnter() {
    this.setState({display: 'block'})
  }

  // Affects web only
  mouseLeave() {
    this.setState({display: 'none'})
  }

  // Affects web only
  click(path, e) {
    if (this.state.display == 'block') {
      window.open(path, "_blank")
    }
  }

  generateCalendarLinks(event) {
    const date = moment(event.date, 'YYYY-MM-DD').format('YYYYMMDD');
    const title = encodeURIComponent(`${event.title} at ${event.source.commonName}`);
    const location = encodeURIComponent(event.source.commonName);
    const description = encodeURIComponent(`Event URL: ${event.url}`);

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&dates=${date}/${date}&text=${title}&location=${location}&details=${description}`;
    const icalUrl = `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:${date}%0ADTEND:${date}%0ASUMMARY:${title}%0ALOCATION:${location}%0ADESCRIPTION:${description}%0AEND:VEVENT%0AEND:VCALENDAR`;

    return {
      google: googleCalendarUrl,
      ical: icalUrl
    };
  }

  handleAIResearch(forceRefetch = false) {
    const { event } = this.props;
    const quickCacheKey = this.cacheKey(event, 'quick');
    const detailedCacheKey = this.cacheKey(event, 'detailed');

    console.log('[AI Quick] Key:', quickCacheKey);
    console.log('[AI Quick] Force refetch:', forceRefetch);

    // Try cached results first (unless forcing refetch)
    if (!forceRefetch) {
      const quickCached = localStorage.getItem(quickCacheKey);
      const detailedCached = localStorage.getItem(detailedCacheKey);

      if (quickCached) {
        try {
          const quickParsed = JSON.parse(quickCached);
          const quickSummary = quickParsed.quickSummary || '';

          // Check if detailed is also cached
          let detailedContent = '';
          if (detailedCached) {
            try {
              const detailedParsed = JSON.parse(detailedCached);
              detailedContent = detailedParsed.aiContent || '';
              console.log('[AI Cache] Both quick and detailed cached - showing both immediately');
            } catch (e) {
              console.warn('AI detailed cache parse failed', e);
            }
          } else {
            console.log('[AI Cache] Only quick cached - showing quick summary');
          }

          this.setState({
            showAIModal: true,
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
      console.log('[AI Quick] Clearing cache (force refetch)');
      this.clearCache(quickCacheKey);
      this.clearCache(detailedCacheKey);
    }

    this.setState({
      showAIModal: true,
      quickSummary: '',
      aiContent: '',
      aiLoading: true,
      aiError: null,
      detailedLoading: false,
    });

    if (API_CONFIG.USE_SAMPLE_DATA) {
      // Sample mode - just show quick summary
      this.setState({
        quickSummary: 'This is a sample quick summary for testing. The show features experimental electronic music at an intimate venue.',
        aiLoading: false
      });
    } else {
      // Fetch quick summary (mode=quick)
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

      // Quick summary stream
      eventSource.addEventListener('quick', (e) => {
        this.setState(prevState => ({
          quickSummary: prevState.quickSummary + e.data,
          aiLoading: false
        }));
      });

      eventSource.onerror = (err) => {
        console.error('SSE Quick Error:', err);
        eventSource.close();

        // Clear the timeout to prevent duplicate detailed research calls
        if (this.quickSummaryTimeout) {
          clearTimeout(this.quickSummaryTimeout);
          this.quickSummaryTimeout = null;
        }

        this.setState((prev) => {
          if (prev.quickSummary && prev.quickSummary.trim().length > 0) {
            // Quick summary completed successfully - auto-trigger detailed research
            console.log('[AI Quick] Quick summary complete (via onerror), auto-triggering detailed research');
            setTimeout(() => this.handleDetailedResearch(), 100);
            return { aiLoading: false };
          }
          return {
            aiLoading: false,
            aiError: 'Failed to connect. Please try again.'
          };
        });
      };

      // Auto-close after completion (fallback if connection doesn't close naturally)
      this.quickSummaryTimeout = setTimeout(() => {
        eventSource.close();
        // Save quick summary to cache
        const cacheData = { quickSummary: this.state.quickSummary };
        localStorage.setItem(quickCacheKey, JSON.stringify(cacheData));

        // Auto-trigger detailed research after quick summary completes
        console.log('[AI Quick] Quick summary complete (via timeout), auto-triggering detailed research');
        this.handleDetailedResearch();
      }, 10000);

      this.eventSource = eventSource;
    }
  }

  handleDetailedResearch() {
    const { event } = this.props;
    const detailedCacheKey = this.cacheKey(event, 'detailed');

    console.log('[AI Detailed] Starting detailed research');

    // Prevent duplicate calls - if already researching, ignore
    if (this.detailedEventSource) {
      console.log('[AI Detailed] Already researching, ignoring duplicate call');
      return;
    }

    // Check cache first - if found, show immediately without loading state
    const cached = localStorage.getItem(detailedCacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        console.log('[AI Detailed] Using cached detailed research - showing immediately');
        this.setState({
          aiContent: parsed.aiContent || '',
          detailedLoading: false,
          aiProofreading: false,
          aiDrafting: false,
        });
        return; // Exit early - don't fetch from server
      } catch (e) {
        console.warn('AI detailed cache parse failed', e);
      }
    }

    // No cache found - show loading state and fetch from server
    console.log('[AI Detailed] No cache found - fetching from server');
    this.setState({
      aiContent: '',
      detailedLoading: true,
      aiProofreading: false,
      aiDrafting: true,
    });

    if (API_CONFIG.USE_SAMPLE_DATA) {
      fetch('/sample_ai_research.md')
        .then(response => response.text())
        .then(text => {
          this.setState({
            aiContent: text,
            detailedLoading: false,
            aiDrafting: false,
          });
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
          this.setState({
            detailedLoading: true,
            aiDrafting: true,
          });
        } else if (e.data === 'researching_artists') {
          this.setState({
            aiProofreading: true,
            aiDrafting: false
          });
        }
      });

      eventSource.addEventListener('artist_list', (e) => {
        console.log('[AI Detailed] Artist list received');
        const artistList = JSON.parse(e.data);

        this.startArtistProgress(artistList);

        // Create placeholder content for each artist
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
        console.log('[AI Detailed] Artist result received');
        const resultData = JSON.parse(e.data);
        const { artist, content } = resultData;

        this.stopArtistProgress(artist);

        this.setState(prevState => {
          const newResults = { ...prevState.artistResults, [artist]: content };
          const { [artist]: _, ...remainingProgress } = prevState.artistProgress;

          // Rebuild content with updated results and placeholders for pending artists
          const orderedContent = prevState.artistList.map(artistName => {
            if (newResults[artistName]) {
              return newResults[artistName];
            } else {
              // Still waiting for this artist
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
        console.log('[AI Detailed] All artists completed');
        this.setState({
          detailedLoading: false,
          aiProofreading: false,
          aiDrafting: false
        }, () => {
          // Save to cache
          const cacheData = { aiContent: this.state.aiContent };
          localStorage.setItem(detailedCacheKey, JSON.stringify(cacheData));
        });
        this.clearArtistProgress();
        eventSource.close();
      });

      eventSource.onerror = (err) => {
        console.error('SSE Detailed Error:', err);
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
      console.log('[AI Cache] Clearing cache:', key);
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

      // Initial tick keeps UI snappy
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
    console.log('[AI Modal] Closing modal');
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
    let imgSrc = this.props.event.img;
    if (imgSrc == "" || imgSrc == null) {
      // Use the per-venue default image.
      imgSrc = this.props.event.source.img;
    }
    const maxTitleLength = 80
    let title = this.props.event.title;

    if (title.length > maxTitleLength) {
      title = title.slice(0,maxTitleLength) + "..."
    }

    if (this.props.textOnly) {
      const calendarLinks = this.generateCalendarLinks(this.props.event);
      return (
        <>
          <div className='textViewEntry'>
              <div className='textViewLink'>
                <div className='calendar-buttons'>
                  <a href={calendarLinks.google} target="_blank" rel="noopener noreferrer" className='calendar-button' title="Add to Google Calendar (Google icon)" data-tooltip="Add to Google Calendar">
                    <i className="fab fa-google"></i>
                  </a>
                  <a href={calendarLinks.ical} download={`${title}.ics`} className='calendar-button' title="Download iCal / generic calendar (.ics)" data-tooltip="Download .ics for any calendar">
                    <i className="fas fa-calendar-alt"></i>
                  </a>
                  <a onClick={() => this.handleAIResearch()} className='calendar-button ai-button' title="AI Concert Research (streamed & proofread)" data-tooltip="AI Concert Research">
                    <i className="fas fa-robot"></i>
                  </a>
                </div>
                <a href={this.props.event.url}>
                  <b className='textViewVenue'>{this.props.event.source.commonName}</b>
                  <span className='textViewTitle'> {title}</span>
                </a>
              </div>
          </div>

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
            onRefetch={() => this.handleAIResearch(true)}
            onGetDetails={this.handleDetailedResearch}
          />
        </>
      )
    } else {
      return (
         <span
           className='event-link'
           href={this.props.event.url}
           onMouseEnter={this.mouseEnter}
           onMouseLeave={this.mouseLeave}
           onTouchStart={() => { this.touchStart(this.props.event.url) }}
          >
            <div className='Event-box'>
              <div className='img-container'>
                  <img
                      className='Event-img'
                      src={imgSrc}
                      onError={this.onImageError}
                      />
                  <div
                    onPointerDown={(e) => {this.click(this.props.event.url, e)}}
                    className='event-description pseudo-link'
                    style={{display: this.state.display}}
                  >
                      <span className='event-venue'> {this.props.event.source.commonName} </span>
                      <h1 className='event-title'>
                        <span> {title} </span>
                      </h1>
                  </div>
              </div>
            </div>
         </span>
      )
    }
  }

  onImageError(e) {
    e.currentTarget.onerror=null
    e.currentTarget.src=MissingImage
  }
}
