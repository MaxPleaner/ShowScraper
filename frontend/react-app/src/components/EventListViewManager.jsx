import React from 'react';
import moment from 'moment';
import { Columns, Box } from 'react-bulma-components';
const { Column } = Columns;
import EventListView from './EventListView'
import _ from 'underscore'

export default class EventListViewManager extends React.Component {
  constructor(props) {
    super(props)
    this.state = { mode: 'day', allEvents: [], events: [], currentDay: moment(new Date()) };
  }

  componentDidUpdate(oldProps) {
    if (this.props.events != oldProps.events) {
      this.setState({...this.state, allEvents: this.props.events, events: this.computeEventsList(this.props.events, this.state.currentDay, this.state.mode)})
    }
  }

  computeEventsList (allEvents, currentDay, mode) {
    if (mode == 'day') {
      return _.pick(allEvents, currentDay.format('MM-DD-YYYY'));
    } else if (mode == 'week') {
      const days = [...Array(7).keys()].map((i) => {
        return currentDay.clone().add(i, 'days').format('MM-DD-YYYY');
      });
      return _.pick(allEvents, days);
    }
  }

  changeMode (newMode) {
    this.setState({...this.state, mode: newMode, events: this.computeEventsList(this.state.allEvents, this.state.currentDay, newMode)})
  }

  currentDateEntry() {
    if (this.state.mode == 'day') {
      const day = this.state.currentDay.format("MM-DD")
      return moment(new Date()).format("MM-DD") == day ? `${day} (today)` : day;
    } else if (this.state.mode == 'week') {
      const nextWeek = this.state.currentDay.clone().add(7, 'days')
      return `${this.state.currentDay.format("MM-DD")} - ${nextWeek.format("MM-DD")}`
    }
  }

  nextDateEntry() {
    if (this.state.mode == 'day') {
      const day = this.state.currentDay.clone().add(1, 'days').format("MM-DD")
      return moment(new Date()).format("MM-DD") == day ? `${day} (today)` : day;
    } else if (this.state.mode == 'week') {
      const nextWeek = this.state.currentDay.clone().add(7, 'days')
      const nextWeek2 = this.state.currentDay.clone().add(14, 'days')
      return `${nextWeek.format("MM-DD")} - ${nextWeek2.format("MM-DD")}`
    }
  }

  prevDateEntry() {
    if (this.state.mode == 'day') {
      const day = this.state.currentDay.clone().add(-1, 'days').format("MM-DD")
      return moment(new Date()).format("MM-DD") == day ? `${day} (today)` : day;
    } else if (this.state.mode == 'week') {
      const nextWeek = this.state.currentDay.clone().add(-7, 'days')
      const nextWeek2 = this.state.currentDay.clone()
      return `${nextWeek.format("MM-DD")} - ${nextWeek2.format("MM-DD")}`
    }
  }

  goToNextDate() {
    let newDay;
    if (this.state.mode == 'day') {
      newDay = this.state.currentDay.clone().add(1, 'days');
    } else if (this.state.mode == 'week') {
      newDay = this.state.currentDay.clone().add(7, 'days');
    }
    this.setState({...this.state, currentDay: newDay, events: this.computeEventsList(this.state.allEvents, newDay, this.state.mode)})
  }

  goToPrevDate() {
    let newDay;
    if (this.state.mode == 'day') {
      newDay = this.state.currentDay.clone().add(-1, 'days');
    } else if (this.state.mode == 'week') {
      newDay = this.state.currentDay.clone().add(-7, 'days');
    }
    this.setState({...this.state, currentDay: newDay, events: this.computeEventsList(this.state.allEvents, newDay, this.state.mode)})
  }

  render() {
     return (
      <div className='ListViewManager'>
        <Columns>
          <Column className='is-one-quarter'>
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
          </Column>
          <Column className='is-one-half'>
            <Box className='mt-3'>
              <Columns>
                <Column>
                  <a onClick={this.goToPrevDate.bind(this)}>
                    <Box>{this.prevDateEntry()}</Box>
                  </a>
                </Column>
                <Column>
                  <Box className='selected'>{this.currentDateEntry()}</Box>
                </Column>
                <Column>
                  <a onClick={this.goToNextDate.bind(this)}>
                    <Box>{this.nextDateEntry()}</Box>
                  </a>
                </Column>
              </Columns>
            </Box>
          </Column>
        </Columns>
        {
          (this.state.allEvents.length == 0) ? (
            <Box>Loading...</Box>
          ) : (
            <EventListView events={this.state.events}/>
          )
        }
      </div>
     )
  }
}
