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
    const currentVenue = "TheList"
    const allEvents = props.events || [];
    const mode = props.mode || DEFAULT_MODE;
    const mapView = props.mapView
    this.state = {
      mapView: mapView,
      mode: mode,
      allEvents: allEvents,
      events: this.computeEventsList(allEvents, currentDay, mode, mapView, currentVenue),
      currentDay: currentDay
    };
  }

  componentDidUpdate(oldProps) {
    if (this.props.events != oldProps.events) {
      this.setState({
        ...this.state,
        allEvents: this.props.events,
        events: this.computeEventsList(
          this.props.events,
          this.state.currentDay,
          this.state.mode,
          this.state.mapView,
          this.state.currentVenue
        )
      })
    }
  }

  computeEventsList (allEvents, currentDay, mode, mapView, currentVenue) {
    if (mode == 'day') {
      if (mapView) {
        if (currentVenue) {
          return {}
        } else {
          const allDayEvents = _.pick(allEvents, currentDay.format(FILE_DATE_FORMAT))
          Object.entries(allDayEvents).forEach(([date, events]) => {
            allDayEvents[date] = events.filter((event) => {
              return event.source.name == currentVenue
            })
          })
          return allDayEvents
        }
      } else {
        return _.pick(allEvents, currentDay.format(FILE_DATE_FORMAT));
      }
    } else if (mode == 'week') {
      const days = [...Array(7).keys()].map((i) => {
        return currentDay.clone().add(i, 'days').format(FILE_DATE_FORMAT);
      });
      return _.pick(allEvents, days);
    }
  }

  changeMode (newMode) {
    this.setState({
      ...this.state,
      mode: newMode,
      events: this.computeEventsList(
        this.state.allEvents,
        this.state.currentDay,
        newMode,
        this.state.mapView,
        this.state.currentVenue
      )
    })
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
    this.setState({
      ...this.state,
      currentDay: newDay,
      events: this.computeEventsList(
        this.state.allEvents,
        newDay,
        this.state.mode,
        this.state.mapView,
        this.state.currentVenue
      )
    })
  }

  goToPrevDate() {
    let newDay;
    if (this.state.mode == 'day') {
      newDay = this.state.currentDay.clone().add(-1, 'days');
    } else if (this.state.mode == 'week') {
      newDay = this.state.currentDay.clone().add(-7, 'days');
    }
    this.setState({
      ...this.state,
      currentDay: newDay,
      events: this.computeEventsList(
        this.state.allEvents,
        newDay,
        this.state.mode,
        this.state.mapView,
        this.state.currentVenue
      )
    })
  }

  render() {
     return (
      <div className='ListViewManager'>

{/*          <Column className='is-one-quarter'>
            <Box className='mt-3'>
              <Columns>
                <Column>
                  <a onClick={this.changeMode.bind(this, "day")}>
                    <Box className={this.state.mode == "day" ? "selected" : ""}>Day</Box>
                  </a>
                </Column>
                <Column>
                  <a onClick={this.changeMode.bind(this, "week")}>
                    <Box className={this.state.mode == "week" ? "selected" : ""}>Week</Box>
                  </a>
                </Column>
              </Columns>
            </Box>
          </Column>*/}

               <div className = 'eventDates'>

                  <a onClick={this.goToPrevDate.bind(this)}>
                    <div className='date-range-select hd-border mybox'>{this.prevDateEntry()}</div>
                  </a>

                  <div className='date-range-select-static hd-border mybox selected'>{this.currentDateEntry()}</div>


                  <a onClick={this.goToNextDate.bind(this)}>
                    <div className='date-range-select hd-border mybox'>{this.nextDateEntry()}</div>
                  </a>
               </div>
        {
          (this.state.allEvents.length == 0) ? (
            <div className='hd-border mybox'>Loading...</div>
          ) : (
            <EventListView textOnly={this.props.textOnly} events={this.state.events}/>
          )
        }
      </div>
     )
  }
}
