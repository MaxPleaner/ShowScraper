import React from 'react';
import { Link } from "react-router-dom";

export default class Nav extends React.Component {
  constructor(props) {
    super(props)
  }

  
  render() {
    return (
        <div class='nav-container'>
        {/* <nav className='flex-row' > */}
            {/* <div className='flex-row' > */}
                <p id='bay-area-shows-text'>Bay Area Shows</p>
                <br />
                <div class='nav-items'>
                    <Link to='/TextView'>
                        <div className={`nav-item ${this.props.route === "TextView" ? "selected" : ""}`}>Text View</div>
                    </Link>

                    <Link to='/TextAndImagesView'>
                        <div className={`nav-item ${(this.props.route === "TextAndImagesView") ? "selected" : ""}`}>Flyers View</div>
                    </Link>
                
                    <Link to='/VenuesListView'>
                        <div className={`nav-item ${this.props.route === "VenuesListView" ? "selected" : ""}`}>Venues</div>
                    </Link>
                    
                    <Link to='/About'>
                        <div className={`nav-item ${this.props.route === "About" ? "selected" : ""}`}>About / Contact</div>
                    </Link>
                    
                    <a href='https://utils.dissonant.info/show_scraper_log'>
                        <div className='nav-item'>Scraper Log</div>
                    </a>


                </div>

            {/* </div> */}
 
            {/* //   </nav> */}
        </div>
    )
  }
}
