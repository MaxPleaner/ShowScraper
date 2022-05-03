import './App.css';

import React from 'react';
import 'bulma/css/bulma.min.css';

// import { Link } from "react-router-dom";


import Nav from './components/Nav';
import ListViewManager from './components/ListViewManager';
import DataLoader from "./utils/DataLoader"

class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = { events: [], venues: {} };
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
    if (this.props.route == "ListView") { currentView = <ListViewManager events={this.state.events} />; }

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
