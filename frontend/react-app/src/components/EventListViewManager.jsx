import React from 'react';
import moment from 'moment';
import { Columns, Box } from 'react-bulma-components';
const { Column } = Columns;
import EventListView from './EventListView'
import _ from 'underscore'

const DEFAULT_MODE = 'week'

// The format of the dates in the JSON files
// const FILE_DATE_FORMAT = 'MM-DD-YYYY';

// Note: intentionally ommitting year here, see comment in DataLoader.js
const FILE_DATE_FORMAT = 'MM-DD';

// Format for a single day
const SINGLE_DAY_FORMAT = 'M/DD (dddd)'
// Format when a date is shown in a range
const WEEK_DAY_FORMAT = "M/DD"

export default class EventListViewManager extends React.Component {
  constructor(props) {
    super(props)
    const currentDay = moment(new Date());
    const allEvents = props.events || [];
    this.state = {
      mode: DEFAULT_MODE,
      allEvents: allEvents,
      events: this.computeEventsList(allEvents, currentDay, DEFAULT_MODE, ""),
      currentDay: currentDay,
      search: ""
    };
  }

  componentDidUpdate(oldProps) {
    if (this.props.events != oldProps.events) {
      this.setState({...this.state, allEvents: this.props.events, events: this.computeEventsList(this.props.events, this.state.currentDay, this.state.mode, this.state.search)})
    }
  }

  computeEventsList (allEvents, currentDay, mode, search) {
    let results;
    if (mode == 'day') {
      results = _.pick(allEvents, currentDay.format(FILE_DATE_FORMAT));
    } else if (mode == 'week') {
      const days = [...Array(7).keys()].map((i) => {
        return currentDay.clone().add(i, 'days').format(FILE_DATE_FORMAT);
      });
      results = _.pick(allEvents, days);
    }
    if (search && search != "") {
      Object.entries(results).forEach(([date, events]) => {
        results[date] = events.filter((event) => {
          return event.source.commonName.toLowerCase().includes(search.toLowerCase())
        })
      })
      // delete the keys of results which have empty values
      Object.entries(results).forEach(([date, events]) => {
        if (events.length == 0) {
          delete results[date]
        }
      })
    }
    return results
  }

  changeMode (newMode) {
    this.setState({...this.state, mode: newMode, events: this.computeEventsList(this.state.allEvents, this.state.currentDay, newMode, this.state.search)})
  }

  currentDateEntry() {
    if (this.state.mode == 'day') {
      const day = this.state.currentDay.format(SINGLE_DAY_FORMAT)
      return day
    } else if (this.state.mode == 'week') {
      const nextWeek = this.state.currentDay.clone().add(7, 'days')
      return `${this.state.currentDay.format(WEEK_DAY_FORMAT)} to ${nextWeek.format(WEEK_DAY_FORMAT)}`
    }
  }

  nextDateEntry() {
    if (this.state.mode == 'day') {
      const day = this.state.currentDay.clone().add(1, 'days').format(SINGLE_DAY_FORMAT)
      return day
    } else if (this.state.mode == 'week') {
      const nextWeek = this.state.currentDay.clone().add(7, 'days')
      const nextWeek2 = this.state.currentDay.clone().add(14, 'days')
      return `${nextWeek.format(WEEK_DAY_FORMAT)} to ${nextWeek2.format(WEEK_DAY_FORMAT)}`
    }
  }

  prevDateEntry() {
    if (this.state.mode == 'day') {
      const day = this.state.currentDay.clone().add(-1, 'days').format(SINGLE_DAY_FORMAT)
      return day
    } else if (this.state.mode == 'week') {
      const nextWeek = this.state.currentDay.clone().add(-7, 'days')
      const nextWeek2 = this.state.currentDay.clone()
      return `${nextWeek.format(WEEK_DAY_FORMAT)} to ${nextWeek2.format(WEEK_DAY_FORMAT)}`
    }
  }

  goToNextDate() {
    let newDay;
    if (this.state.mode == 'day') {
      newDay = this.state.currentDay.clone().add(1, 'days');
    } else if (this.state.mode == 'week') {
      newDay = this.state.currentDay.clone().add(7, 'days');
    }
    this.setState({...this.state, currentDay: newDay, events: this.computeEventsList(this.state.allEvents, newDay, this.state.mode, this.state.search)})
  }

  goToPrevDate() {
    let newDay;
    if (this.state.mode == 'day') {
      newDay = this.state.currentDay.clone().add(-1, 'days');
    } else if (this.state.mode == 'week') {
      newDay = this.state.currentDay.clone().add(-7, 'days');
    }
    this.setState({...this.state, currentDay: newDay, events: this.computeEventsList(this.state.allEvents, newDay, this.state.mode, this.state.search)})
  }

  searchInput = (event) => {
    const search = event.currentTarget.value
    this.setState({...this.state, search: search, events: this.computeEventsList(this.state.allEvents, this.state.currentDay, this.state.mode, search)})
  }

  render() {
     return (
      <div className='ListViewManager'>

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

               <div className="search">
                <input type="text" placeholder="Search Venues" onChange={this.searchInput}/>
               </div>
               <br />
               <div className = 'eventDates'>

                  <a onClick={this.goToPrevDate.bind(this)}>
                    <div className='date-range-select  nav-item'>{this.prevDateEntry()}</div>
                  </a>

                  <div className='date-range-select-static  nav-item selected'>{this.currentDateEntry()}</div>


                  <a onClick={this.goToNextDate.bind(this)}>
                    <div className='date-range-select  nav-item'>{this.nextDateEntry()}</div>
                  </a>
               </div>
        {
          (this.state.allEvents.length == 0) ? (
            <div className='loading'>Loading months and months of show listings. Give it just a few seconds ...</div>
          ) : (
            <EventListView textOnly={this.props.textOnly} events={this.state.events}/>
          )
        }
      </div>
     )
  }
}
