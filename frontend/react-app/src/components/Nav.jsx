import React from 'react';
import { Columns, Box } from 'react-bulma-components';
const { Column } = Columns;

export default class Nav extends React.Component {
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
              <a href='/ListView'>
                <Box className={this.props.route === "ListView" ? "selected" : ""}>List View</Box>
              </a>
            </Column>
{/*            <Column className="is-narrow">
              <Box className={this.props.route === "Test" ? "selected" : ""}>Map View</Box>
            </Column>*/}
            <Column className="is-narrow">
              <a href='/VenuesListView'>
                <Box className={this.props.route === "VenuesListView" ? "selected" : ""}>Venues</Box>
              </a>
            </Column>
{/*            <Column className="is-narrow">
              <Box className={this.props.route === "todo" ? "selected" : ""}>Submit Event</Box>
            </Column>*/}
{/*            <Column className="is-narrow">
              <Box className={this.props.route === "todo" ? "selected" : ""}>About</Box>
            </Column>*/}
          </Columns>
        </Box>
      </div>
    )
  }
}
