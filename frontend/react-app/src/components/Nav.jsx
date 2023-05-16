import React from 'react';
import { Link } from "react-router-dom";

export default class Nav extends React.Component {
  constructor(props) {
    super(props)
  }

  
  render() {
    return (
        <nav className='flex-row' >
            <h1>Bay Area Shows</h1>
                


            <div className='flex-row' >
                <h3>Display:</h3>

                <div>
                    <Link to='/TextView'>
                        <div className={`nav-item ${this.props.route === "TextView" ? "selected" : ""}`}>Text</div>
                    </Link>

                    <Link to='/TextAndImagesView'>
                        <div className={`nav-item ${(this.props.route === "TextAndImagesView") ? "selected" : ""}`}>Text & Images</div>
                    </Link>
                
                    <Link to='/VenuesListView'>
                        <div className={`nav-item ${this.props.route === "VenuesListView" ? "selected" : ""}`}>Venues</div>
                    </Link>
                    
                    <Link to='/About'>
                        <div className={`nav-item ${this.props.route === "About" ? "selected" : ""}`}>About / Contact</div>
                    </Link>

                </div>

            </div>
 
      </nav>
    )
  }
}
