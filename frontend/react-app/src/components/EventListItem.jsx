import React, {useState} from 'react';
import MissingImage from '../MissingImage.png'

export default class EventListItem extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      display: 'none',
    }

      this.mouseEnter = this.mouseEnter.bind(this);
      this.mouseLeave = this.mouseLeave.bind(this);
      this.click = this.click.bind(this)
    }

    /////////////////////////////////////////////////////////// 
    // Some complexity in all this due to mouseover handling //
    // on mobile vs web.                                     //
    ///////////////////////////////////////////////////////////

    // Affects web only
    mouseEnter() {
      this.setState({display: 'block'})
    }

    // Affects web only
    mouseLeave() {
      this.setState({display: 'none'})
    }

    // Affects web only
    click(path, e) {
      if (this.state.display == 'block') {
        window.open(path, "_blank")
      }
    }

  render() {
    let imgSrc = this.props.event.img;
    if (imgSrc == "" || imgSrc == null) {
      // Use the per-venue default image.
      imgSrc = this.props.event.source.img;
    }
    const maxTitleLength = 80
    let title = this.props.event.title;

    if (title.length > maxTitleLength) {
      title = title.slice(0,maxTitleLength) + "..."
    }

    if (this.props.textOnly) {
      return (
        <div className='textViewEntry'>
            {/* <h1 className='textViewVenue'>{this.props.event.source.commonName}</h1> */}
            {/* <div> */}
              <a className='textViewLink' href={this.props.event.url}>
                <b className='textViewVenue'>{this.props.event.source.commonName}</b>
                <span className='textViewTitle'> {title}</span>
              </a>
            {/* </div> */}
        </div>
      )
    } else {
      return (
         <span
           className='event-link'
           href={this.props.event.url}
           onMouseEnter={this.mouseEnter}
           onMouseLeave={this.mouseLeave}
           onTouchStart={() => { this.touchStart(this.props.event.url) }}
          >
            <div className='Event-box'>
              <div className='img-container'>
                  <img
                      className='Event-img'
                      src={imgSrc}
                      onError={this.onImageError}
                      />
                  <div
                    onPointerDown={(e) => {this.click(this.props.event.url, e)}}
                    className='event-description pseudo-link'
                    style={{display: this.state.display}}
                  >
                      <span className='event-venue'> {this.props.event.source.commonName} </span>
                      {/*<br />*/}
                      <h1 className='event-title'>
                        <span> {title} </span>
                      </h1>
                  </div>
              </div>
            </div>
         </span>
      )
    }
  }

  onImageError(e) {
    e.currentTarget.onerror=null
    e.currentTarget.src=MissingImage
  }
}
