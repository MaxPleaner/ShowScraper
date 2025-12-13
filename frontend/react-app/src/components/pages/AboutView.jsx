import React from 'react';
// import { Columns, Box } from 'react-bulma-components';
// const { Column } = Columns;
// import { Link } from "react-router-dom";

export default class AboutView extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    const dp_link = <a href='https://maxpleaner.com'>maxpleaner.com</a>
    const gh_link = <a href='https://github.com/maxpleaner/showscraper'>github.com/maxpleaner/showscraper</a>
    const list_link = <a href='http://www.foopee.com/punk/the-list/'>The List</a>
    return (
      <div className='About'>
        <p>
          Made by <a href='https://maxpleaner.com'>Max Pleaner</a>.
        </p>
        <br />

        <p>
          <a href="https://github.com/maxpleaner/showscraper">Source code on Github.</a>
        </p>
        <br />

        <p>
          Over 40 web scrapers are run daily on the server.
        </p>
        <br />
        
        <p>
          If you want to get your show added, the best way to get a wide audience is to use the "Send Steve Mail" link on <a href='http://www.foopee.com/punk/the-list/'>The List</a> and it will end up here the following day.
        </p>
        <br />

        <p>
          I am looking for collaborators to improve this website or make other awesome things!
        </p>
      </div>
    )
  }
}
