import React from 'react';
import { Columns, Box } from 'react-bulma-components';
const { Column } = Columns;

export default class EventListItem extends React.Component {
  constructor(props) {
    super(props)
  }
  render() {
    let imgSrc = this.props.event.img;
    if (imgSrc == "") {
      imgSrc = "/MissingImage.png"
    }
    const maxTitleLength = 80
    let title = this.props.event.title;
    if (title.length > maxTitleLength) {
      title = title.slice(0,maxTitleLength) + "..."
    }
    return (
      <Column className='is-full-tablet is-half-desktop'>
        <Columns className='Event-box'>
          <Column className='is-one-third'>
             <a href={this.props.event.url}><Box ><img className='Event-img' src={imgSrc} /></Box></a>
          </Column>
          <Column className='is-two-thirds'><b>{this.props.event.source.commonName}</b><br />{title}</Column>
        </Columns>
      </Column>
    )
  }
}
