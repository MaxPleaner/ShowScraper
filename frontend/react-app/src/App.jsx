import './App.css';

import React from 'react';
import 'bulma/css/bulma.min.css';
import './vendor/handdrawn.css';

// import { Link } from "react-router-dom";


import Nav from './components/Nav';
import EventListViewManager from './components/EventListViewManager';
import AboutView from './components/AboutView';
import VenuesList from './components/VenuesList';
import DataLoader from "./utils/DataLoader"

class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = { events: [], venues: [] };
  }

  async fetchJsonData() {
    const venues = await DataLoader.loadVenueData()
    const events = await DataLoader.loadEventData(venues)

    this.setState({ events: events, venues: venues });
  }

  async componentDidMount() {
    await this.fetchJsonData()
  }

  render() {
    let currentView
    if (this.props.route == "TextAndImagesView") { currentView = <EventListViewManager events={this.state.events} />; }
    if (this.props.route == "TextView") { currentView = <EventListViewManager events={this.state.events} textOnly={true} />; }
    if (this.props.route == "MapView") { currentView = <EventListViewManager events={this.state.events} mode='day' mapView={true} />; }
    if (this.props.route == "VenuesListView") { currentView = <VenuesList venues={this.state.venues} />; }
    if (this.props.route == "About") { currentView = <AboutView />; }

    return (
        <div className="App-body">
          <div className="App-body-content">
            <Nav route={this.props.route} />
            {currentView}
          </div>
        </div>
    );
  }
}

export { App }
