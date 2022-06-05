import React from 'react';
import { Columns, Box } from 'react-bulma-components';
const { Column } = Columns;
import MissingImage from '../MissingImage.png'

export default class EventListItem extends React.Component {
  constructor(props) {
    super(props)
  }
  render() {
    let imgSrc = this.props.event.img;
    if (imgSrc == "") {
      imgSrc = MissingImage;
    }
    const maxTitleLength = 80
    let title = this.props.event.title;
    if (title.length > maxTitleLength) {
      title = title.slice(0,maxTitleLength) + "..."
    }
    return (
      <Column className='is-full-tablet is-half-desktop'>
       <a className='event-link' href={this.props.event.url}>
        <Columns className='Event-box'>
          <Column className='is-one-third'>
               {/*<div className='img-background'>*/}
                 <img
                   className='Event-img'
                   src={imgSrc}
                   onError={this.onImageError}
                  />
               {/*</div>*/}
          </Column>
          <Column className='is-two-thirds'>
            <div className='event-venue'>
              {this.props.event.source.commonName}
             </div>
             <br />
             <div className='event-title'>
               {title}
             </div>
          </Column>
        </Columns>
       </a>
      </Column>
    )
  }

  onImageError(e) {
    e.currentTarget.onerror=null
    e.currentTarget.src=MissingImage
  }
}
