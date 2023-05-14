import React from 'react';
import { Columns, Box } from 'react-bulma-components';
const { Column } = Columns;
import { Link } from "react-router-dom";

export default class Nav extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <div className='Nav'>
          {/*<Columns>*/}
            <Column className=''>
              <Columns className='is-centered'>
                <Column className='is-narrow'>
                  <div className='site-title mybox'>Bay Area Shows</div>
                </Column>
                <Column className="is-narrow">
                  <Link to='/TextView'>
                    <div className={`mybox ${this.props.route === "TextView" ? "selected" : ""}`}>Text</div>
                  </Link>
                </Column>
                <Column className="is-narrow">
                  <Link to='/TextAndImagesView'>
                    <div className={`mybox ${(this.props.route === "TextAndImagesView") ? "selected" : ""}`}>Text + Images</div>
                  </Link>
                </Column>
                <Column className="is-narrow">
                  <Link to='/MapView'>
                    <div className={`mybox ${(this.props.route === "MapView") ? "selected" : ""}`}>Map View</div>
                  </Link>
                </Column>
    {/*            <Column className="is-narrow">
                  <Box className={this.props.route === "Test" ? "selected" : ""}>Map View</Box>
                </Column>*/}
                <Column className="is-narrow">
                  <Link to='/VenuesListView'>
                    <div className={`mybox ${this.props.route === "VenuesListView" ? "selected" : ""}`}>Venues</div>
                  </Link>
                </Column>
                <Column className="is-narrow">
                  <Link to='/About'>
                    <div className={`mybox ${this.props.route === "About" ? "selected" : ""}`}>About / Contact</div>
                  </Link>
                </Column>
               </Columns>
              </Column>
{/*            <Column className="is-narrow">
              <Box className={this.props.route === "todo" ? "selected" : ""}>Submit Event</Box>
            </Column>*/}
{/*            <Column className="is-narrow">
              <Box className={this.props.route === "todo" ? "selected" : ""}>About</Box>
            </Column>*/}
          {/*</Columns>*/}
      </div>
    )
  }
}
