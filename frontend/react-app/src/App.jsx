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
      <div class='Event-box'>
        <h4>
          <i>({this.props.event.source}) </i>
          <br />
          <span>{this.props.event.title}</span>
          <br />
          <a href={this.props.event.url}>
            <img class='Event-img' src={this.props.event.img} />
          </a>
         </h4>
      </div>
    )
  }
}

class Test extends React.Component {
  render() {
    return (
      <div>
        <Box>
          <Columns>
            <Column>
              <Box>Foo</Box>
            </Column>
            <Column>
              <Box>Bar</Box>
            </Column>
          </Columns>
         </Box>
        <Link to="/">Root</Link><br />
      </div>
    )
  }
}

class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {events: []};
  }

  async componentDidMount() {
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

  render() {
    const events = Object.entries(this.state.events).map(([date, date_events], idx) => {
      return (
        <div className='Day-group'>
          <h2>{date}</h2>
          <div class='Day-events'>
            {date_events.map((date_event, idx2) => {
              return <EventListItem key={(idx + 1) + idx2 } event={date_event} />
            })}
          </div>
        </div>
      )
    })

    return (
        <div className="App">
          <Link to="/test">TestPage</Link><br />
          <div className="App-body">
            {events}
          </div>
        </div>
    );
  }
}

export { App, Test };
