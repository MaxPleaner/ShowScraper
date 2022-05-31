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
          <Columns>
            <Column className='is-full'>
              <Columns className='is-centered'>
                <Column className='is-narrow'>
                  <div class='site-title mybox'>Bay Area Shows</div>
                </Column>
                <Column className="is-narrow">
                  <a href='/ShowScraper/ListView'>
                    <div className={`mybox ${this.props.route === "ListView" ? "selected" : ""}`}>List View</div>
                  </a>
                </Column>
    {/*            <Column className="is-narrow">
                  <Box className={this.props.route === "Test" ? "selected" : ""}>Map View</Box>
                </Column>*/}
                <Column className="is-narrow">
                  <a href='/ShowScraper/VenuesListView'>
                    <div className={`mybox ${this.props.route === "VenuesListView" ? "selected" : ""}`}>Venues</div>
                  </a>
                </Column>
               </Columns>
              </Column>
{/*            <Column className="is-narrow">
              <Box className={this.props.route === "todo" ? "selected" : ""}>Submit Event</Box>
            </Column>*/}
{/*            <Column className="is-narrow">
              <Box className={this.props.route === "todo" ? "selected" : ""}>About</Box>
            </Column>*/}
          </Columns>
      </div>
    )
  }
}
