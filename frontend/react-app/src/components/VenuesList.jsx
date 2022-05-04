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

  render() {
    const venues = this.state.venues.map((venue, idx) => {
      return (
        <Column key={idx} className='venue is-half'>
          <Box>
            <Columns>
              <Column className='is-full venue-name'>
                <Box>{venue.commonName}</Box>
              </Column>
              <Column className='is-full venue-description'>
                <Box>{venue.desc}</Box>
              </Column>
            </Columns>
          </Box>
        </Column>
      )
    })
    return (
    <Box className='mt-3'>
      {
        this.state.venues.length == 0 ? (
          <Box>... Loading ... </Box>
        ) : (
          <Columns className='VenuesList is-multiline'>
              {venues}
          </Columns>
        )
      }
    </Box>
    )
  }
}
