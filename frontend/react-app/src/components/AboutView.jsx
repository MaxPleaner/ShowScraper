import React from 'react';
// import { Columns, Box } from 'react-bulma-components';
// const { Column } = Columns;
// import { Link } from "react-router-dom";

export default class AboutView extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    const dp_link = <a href='https://dissonant.info'>dissonant.info</a>
    const gh_link = <a href='https://github.com/maxpleaner/showscraper'>github.com/maxpleaner/showscraper</a>
    const list_link = <a href='http://www.foopee.com/punk/the-list/'>The List</a>
    return (
      <div className='About'>
        <p>This site was built by Max Pleaner ({dp_link}).</p>
        <br />

        <p>The goal is to build upon the excellent resource known as the "List" by directly scraping
        venue websites for show listings. "The List" is also scraped, which results in a more comprehensive
        set of listings. Over 40 web scrapers have been written for the purposes of this site
        (using Selenium automated browser, scripted in Ruby). The front end is done with React
        and it's hosted on Github pages. Scrapers are re-run daily.</p>
        <br />

        <p>If you would like to request a new venue be added, please email maxpleaner @ gmail.com</p>
        <br />

        <p>If you would like to add an unlisted show, use the "Send Steve Mail" link on {list_link} and it will end up here the following day.</p>
        <br />

        <p>If you would like to volunteer to maintain or add scrapers (or work on the site in some other capacity),
        the repo is {gh_link}. Please be in touch I can help orient you.</p>
      </div>
    )
  }
}
