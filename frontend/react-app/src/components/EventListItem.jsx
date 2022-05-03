import React from 'react';
import { Columns, Box } from 'react-bulma-components';
const { Column } = Columns;

export default class EventListItem extends React.Component {
  constructor(props) {
    super(props)
  }
  render() {
    return (
      <Column className='is-half'>
        <Columns className='Event-box is-multiline'>
          <Column className='is-half'>
             <a href={this.props.event.url}><Box><img className='Event-img' src={this.props.event.img} /></Box></a>
          </Column>
          <Column className=''><Box><b>{this.props.event.source.name}</b><br />{this.props.event.title}</Box></Column>
        </Columns>
      </Column>
    )
  }
}
