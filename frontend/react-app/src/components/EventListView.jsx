import React from 'react';
import { Columns, Box } from 'react-bulma-components';
const { Column } = Columns;
import EventListItem from './EventListItem'
import moment from 'moment';

export default class ListView extends React.Component {
  render() {
    const events = Object.entries(this.props.events).map(([date, date_events], idx) => {
      return (
        <div key={idx} className='Day-group'>
          <div className='daygroup-title'>{moment(date).format("M/DD (dddd)")}</div>
          <Columns className='Day-events is-multiline'>
            {date_events.map((date_event, idx2) => {
              return <EventListItem key={(idx + 1) + idx2 } event={date_event} textOnly={this.props.textOnly} />
            })}
          </Columns>
        </div>
      )
    })
    return (
      <div className='Events-list'>
        {events}
      </div>
    )
  }
}
