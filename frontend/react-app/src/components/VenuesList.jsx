import React from 'react';
import moment from 'moment';
import { Columns, Box } from 'react-bulma-components';
const { Column } = Columns;
import _ from 'underscore'

export default class VenuesList extends React.Component {
  constructor(props) {
    super(props)
    this.state = { venues: [] };
  }

  componentDidUpdate(oldProps) {
    if (this.props.venues != oldProps.venues) {
      this.setState({ ...this.state, venues: this.props.venues })
    }
  }

  buildVenuesList(venues) {
    return venues.map((venue, idx) => {
      return (
        <Column key={idx} className='is-half'>
          <div class='venue'>
            <Columns>
              <Column className='is-one-third venue-name'>
                {venue.commonName}
              </Column>
              <Column className='is-one-third venue-website'>
                <a href={venue.website}>Website</a>
              </Column>
              <Column className='is-one-third venue-view-events'>
                View events
              </Column>
              <Column className='is-full venue-description'>
                {venue.desc}
              </Column>
            </Columns>
          </div>
        </Column>
      )
    })
  }

  render() {
    const sfVenues = this.state.venues.filter((venue) => venue.region == "San Francisco")
    const eastBayVenues = this.state.venues.filter((venue) => venue.region == "East Bay")
    const otherVenues = this.state.venues.filter((venue) => venue.region == "Other")
    return (
      <div className='mybox mt-3'>
        {
          this.state.venues.length == 0 ? (
            <div className='hd-border mybox'>... Loading ... </div>
          ) : (
            <div>
              <div className='venue-region-title'>San Francisco</div>
              <Columns className='VenuesList is-multiline'>
                  {this.buildVenuesList(sfVenues)}
              </Columns>
              <div className='venue-region-title'>EastBay</div>
              <Columns className='VenuesList is-multiline'>
                  {this.buildVenuesList(eastBayVenues)}
              </Columns>
              <div className='venue-region-title'>Other</div>
              <Columns className='VenuesList is-multiline'>
                  {this.buildVenuesList(otherVenues)}
              </Columns>
            </div>
          )
        }
      </div>
    )
  }
}
