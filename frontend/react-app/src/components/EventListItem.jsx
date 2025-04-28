import React, {useState} from 'react';
import MissingImage from '../MissingImage.png'
import moment from 'moment';

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

  generateCalendarLinks(event) {
    const date = moment(event.date, 'YYYY-MM-DD').format('YYYYMMDD');
    const title = encodeURIComponent(`${event.title} at ${event.source.commonName}`);
    const location = encodeURIComponent(event.source.commonName);
    const description = encodeURIComponent(`Event URL: ${event.url}`);

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&dates=${date}/${date}&text=${title}&location=${location}&details=${description}`;
    const icalUrl = `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:${date}%0ADTEND:${date}%0ASUMMARY:${title}%0ALOCATION:${location}%0ADESCRIPTION:${description}%0AEND:VEVENT%0AEND:VCALENDAR`;

    return {
      google: googleCalendarUrl,
      ical: icalUrl
    };
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
      const calendarLinks = this.generateCalendarLinks(this.props.event);
      return (
        <div className='textViewEntry'>
            <div className='textViewLink'>
              <div className='calendar-buttons'>
                <a href={calendarLinks.google} target="_blank" rel="noopener noreferrer" className='calendar-button' title="Add to Google Calendar">
                  <i className="fab fa-google"></i>
                </a>
                <a href={calendarLinks.ical} download={`${title}.ics`} className='calendar-button' title="Download iCal">
                  <i className="fas fa-calendar-alt"></i>
                </a>
              </div>
              <a href={this.props.event.url}>
                <b className='textViewVenue'>{this.props.event.source.commonName}</b>
                <span className='textViewTitle'> {title}</span>
              </a>
            </div>
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
