import React from 'react';
import moment from 'moment';
import _ from 'underscore'

export default class VenuesList extends React.Component {
  constructor(props) {
    super(props)
    this.state = { venues: props.venues || [] };
  }

  componentDidUpdate(oldProps) {
    if (this.props.venues != oldProps.venues) {
      this.setState({ ...this.state, venues: this.props.venues })
    }
  }

  buildVenuesList(venues) {
    return venues.map((venue, idx) => {
      return (
        <div key={idx} className='venue-container '>
              <div className='description-container'>
              <div className='venue-name'> 
                <i className='location-icon'></i> 
                {venue.commonName}
                <div></div>
              </div>
              
                <div className='venue-description'>{venue.desc}</div>
              </div>
                <a className='venue-link' href={venue.website}> ↗  &nbsp; Website</a>
        </div>
      )
    })
  }

  render() {
    const sfVenues = this.state.venues.filter((venue) => venue.region == "San Francisco")
    const eastBayVenues = this.state.venues.filter((venue) => venue.region == "East Bay")
    const otherVenues = this.state.venues.filter((venue) => venue.region == "Other")
    return (
      <div className=' VenuesListContainer'>
        {
          this.state.venues.length == 0 ? (
            <div className='loading '>... Loading ... </div>
          ) : (
            <div>
              <div className='venue-region-title'>
                <span className='venue-region-title-text'>San Francisco</span>  </div>
              <div className='VenuesList '>
                  {this.buildVenuesList(sfVenues)}
              </div>
              <div className='venue-region-title'>
                <span className='venue-region-title-text'>EastBay</span> </div>
              <div className='VenuesList '>
                  {this.buildVenuesList(eastBayVenues)}
              </div>
              <div className='venue-region-title'>
                <span className='venue-region-title-text'>Other</span> </div>
              <div className='VenuesList '>
                  {this.buildVenuesList(otherVenues)}
              </div>
            </div>
          )
        }
      </div>
    )
  }
}
