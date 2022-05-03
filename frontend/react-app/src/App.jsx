import './App.css';

import React from 'react';
import { Link } from "react-router-dom";

import $ from 'jquery';
import _ from 'underscore';
import moment from 'moment';

import 'bulma/css/bulma.min.css';
import { Columns, Box } from 'react-bulma-components';
const { Column } = Columns;

class EventListItem extends React.Component {
  constructor(props) {
    super(props)
  }
  render() {
    return (
      <Column className='is-half'>
        <Columns className='Event-box is-multiline'>
          <Column className='is-half'>
             <a href={this.props.event.url}><Box><img className='Event-img' src={this.props.event.img} /></Box></a>
          </Column>
          <Column className=''><Box><b>{this.props.event.source}</b><br />{this.props.event.title}</Box></Column>
        </Columns>
      </Column>
    )
  }
}

class Nav extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <div className='Nav'>
        <Box>
          <Columns>
            <Column className='is-narrow'>
              <Box>Bay Area Shows</Box>
            </Column>
            <Column className="is-narrow">
              <a href='/'>
                <Box className={this.props.route === "ListView" ? "selected" : ""}>List View</Box>
              </a>
            </Column>
            <Column className="is-narrow">
              <Box className={this.props.route === "Test" ? "selected" : ""}>Map View</Box>
            </Column>
            <Column className="is-narrow">
              <Box className={this.props.route === "todo" ? "selected" : ""}>Venues</Box>
            </Column>
            <Column className="is-narrow">
              <Box className={this.props.route === "todo" ? "selected" : ""}>Submit Event</Box>
            </Column>
            <Column className="is-narrow">
              <Box className={this.props.route === "todo" ? "selected" : ""}>About</Box>
            </Column>
          </Columns>
        </Box>
      </div>
    )
  }
}

class ListViewManager extends React.Component {
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
        <ListView events={this.state.events}/>
      </div>
     )
  }
}

class ListView extends React.Component {
  render() {
    const events = Object.entries(this.props.events).map(([date, date_events], idx) => {
      return (
        <div key={idx} className='Day-group'>
          <Box>{date}</Box>
          <Columns className='Day-events is-multiline'>
            {date_events.map((date_event, idx2) => {
              return <EventListItem key={(idx + 1) + idx2 } event={date_event} />
            })}
          </Columns>
        </div>
      )
    })
    return (
      <div className='Events-list'>
        {events}
      </div>
    )
  }
}

class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {events: []};
  }

  async fetchJsonData() {
    var data = await $.getJSON("http://storage.googleapis.com/show-scraper-data/events.json");
    var newData = []
    Object.entries(data).forEach(([source, events]) => {
      events.forEach((event) => {
        let newEvent = {
          ...event,
          source: source
        }
        newData.push(newEvent)
      })
    })
    var groupedData = _.groupBy(newData, (event) => {
      let date = moment(event.date, 'YYYY-MM-DD')
      return date.format('MM-DD-YYYY')
    })
    this.setState({ events: groupedData });
  }

  async componentDidMount() {
    await this.fetchJsonData()
  }

  render() {
    return (
        <div className="App-body">
          <div className="App-body-content">
            <Nav route={this.props.route} />
            <ListViewManager events={this.state.events} />
          </div>
        </div>
    );
  }
}

export { App }
