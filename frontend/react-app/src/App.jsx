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
      <div className='Event-box'>
        <h4>
          <i>({this.props.event.source}) </i>
          <br />
          <span>{this.props.event.title}</span>
          <br />
          <a href={this.props.event.url}>
            <img className='Event-img' src={this.props.event.img} />
          </a>
         </h4>
      </div>
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
    this.state = { mode: 'day' };
  }

  changeMode (newMode) {
    this.setState({...this.state, mode: newMode})
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
          <Column className='is-one-third'>
          </Column>
        </Columns>
        <ListView events={this.props.events}/>
      </div>
     )
  }
}

class ListView extends React.Component {
  render() {
    const events = Object.entries(this.props.events).map(([date, date_events], idx) => {
      return (
        <div key={idx} className='Day-group'>
          <h2>{date}</h2>
          <div className='Day-events'>
            {date_events.map((date_event, idx2) => {
              return <EventListItem key={(idx + 1) + idx2 } event={date_event} />
            })}
          </div>
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
      let date = moment(event.date)
      return moment(event.date).startOf('day').format();
    })

    this.setState({ events: groupedData });
  }

  async componentDidMount() {
    this.fetchJsonData()
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
