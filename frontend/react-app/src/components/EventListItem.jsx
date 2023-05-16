import React, {useState} from 'react';
import MissingImage from '../MissingImage.png'

export default class EventListItem extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
        display: 'none'
      }

      this.mouseEnter = this.mouseEnter.bind(this);
      this.mouseLeave = this.mouseLeave.bind(this);
    }

    mouseEnter() {  this.setState({display: 'block'}) }
    mouseLeave() {  this.setState({display: 'none'})  }

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

    if (this.props.textOnly) {
      return (
        <div className='textViewEntry'>
            <h1 className='textViewVenue'><i className='location-icon'></i> {this.props.event.source.commonName}</h1>
            <div>
              <a className='textViewLink' href={this.props.event.url}>
                <span className='textViewTitle'> {title}</span>
              </a>
            </div>
        </div>
      )
    } else {
      return (
    
         
         <a className='event-link ' href={this.props.event.url} onMouseEnter={this.mouseEnter} onMouseLeave={this.mouseLeave}>
          
            <div className='Event-box'>
                    <div className='img-container'>
                        <img
                            className='Event-img'
                            src={imgSrc}
                            onError={this.onImageError}
                            />
                        <div className='event-description' style={{display: this.state.display}} >
                            <small>venue:</small>
                            <span className='event-venue'>   {this.props.event.source.commonName} </span>
                            <br />
                            <br />
                            <small>event:</small>
                            <br />
                            <h1 className='event-title'>  {title} </h1>
                        </div>
                    </div>
                
            </div>
         </a>
      )
    }
  }

  onImageError(e) {
    e.currentTarget.onerror=null
    e.currentTarget.src=MissingImage
  }
}
