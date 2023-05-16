import React from 'react';
import { Columns, Box } from 'react-bulma-components';
const { Column } = Columns;
import EventListItem from './EventListItem'
import moment from 'moment';

export default class ListView extends React.Component {
  render() {
    const events = Object.entries(this.props.events).map(([date, date_events], idx) => {
      return (
        <div key={idx} className='Day-group '>
          
          <div className='daygroup-title' > 
            <span className='daygroup-title-text'>{moment(date).format("M/DD (dddd)")}</span>
           </div>
          
          <div className='Day-events is-multiline masonry-with-columns'>
            {date_events.map((date_event, idx2) => {
              return <EventListItem key={(idx + 1) + idx2 } event={date_event} textOnly={this.props.textOnly} />
            })}
          </div>
        </div>
      )
    })
    return (
      <div className='Events-list '>
        {events}
      </div>
    )
  }
}
