import React from 'react';
import { Columns, Box } from 'react-bulma-components';
const { Column } = Columns;
import EventListItem from './EventListItem'
import moment from 'moment';

const REGIONS = {
  EAST_BAY: 'East Bay',
  SAN_FRANCISCO: 'San Francisco',
  PACIFICA: 'Pacifica',
  SOUTH_BAY: 'South Bay',
  SANTA_CRUZ: 'Santa Cruz',
  NORTH_BAY: "North Bay",
  SACRAMENTO: "Sacramento",
  OTHER: 'Other',
  //////////////////////////////////////////////////////////////////////////////
  // If adding an entry here, make sure to add it to the sorting array below  //
  //////////////////////////////////////////////////////////////////////////////
}

const REGION_SORTING = [
  REGIONS.EAST_BAY,
  REGIONS.SAN_FRANCISCO,
  REGIONS.PACIFICA,
  REGIONS.SOUTH_BAY,
  REGIONS.NORTH_BAY,
  REGIONS.SANTA_CRUZ,
  REGIONS.SACRAMENTO,
  REGIONS.OTHER,
]

export default class ListView extends React.Component {
  groupByRegion(events) {
    return Object.groupBy(events, (event) => {
      let region = event.source.region
      if (region == REGIONS.OTHER) {
        // Events from The List are not tagged with a region, so we try and deduce the region
        // based on the event name (which often includes a city).
        const regionFallbacks = [
          [REGIONS.EAST_BAY, ['oakland', 'port costa', 'richmond', 'berkeley', 'alameda', 'vallejo', 'emeryville', 'oakley', 'walnut creek', 'antioch', 'concord', 'lafayette']],
          [REGIONS.PACIFICA, ['pacifica']],
          [REGIONS.SANTA_CRUZ, ['santa cruz', 'santa curz', 'monterey', 'big sur', 'felton']],
          [REGIONS.SAN_FRANCISCO, ['san francisco', 'sf', 's.f.', 'thrillhouse']],
          [REGIONS.SACRAMENTO, ['sacramento', 'brooks']],
          [REGIONS.SOUTH_BAY, ['menlo park', 'redwood city', 'saratoga', 'memlo park', 'palo alto', 'san jose']],
          [REGIONS.NORTH_BAY, ['novato', 'sebastopol', 'mill valley', 'piedmont', 'santa rosa', 'fairfax', 'marin', 'petaluma', 'sonoma', 'napa', 'healdsburg']],
        ]
        regionFallbacks.forEach(([fallbackRegion, regionStrings]) => {
          if (regionStrings.some((str) => event.source.commonName.toLowerCase().includes(str))) {
            region = fallbackRegion
          }
        })
        if (region == REGIONS.OTHER) {
          console.log(event.source.commonName)
          // debugger
        }
        if (!region) {
          debugger
        }
      }
      return region
    })
  }

  render() {
    const events = Object.entries(this.props.events).map(([date, date_events], idx) => {
      const regionGroups = this.groupByRegion(date_events)
      const regionGroupsSorted = REGION_SORTING.map((region) => {
        return [region, regionGroups[region] || []]
      })

      return (
        <div key={idx} className='Day-group '>

          <div className='daygroup-title' >
            <span className='daygroup-title-text'>{moment(date, "MM-DD").format("M/DD (dddd)")}</span>
           </div>

          <div className={`Day-events is-multiline ${this.props.textOnly ? '' : 'masonry-with-columns'}`}>
            {
              regionGroupsSorted.map(([region, region_events], idx2) => {
                if (region_events.length == 0) { return }
                const regionEvents = region_events.map((date_event, idx2) => {
                  return <EventListItem key={(idx + 1) + idx2 } event={date_event} textOnly={this.props.textOnly} />
                })
                return (
                  <div className="Region" key={region}>
                    { this.props.textOnly ? <p className="region-title">{region}</p> : ""}
                    { regionEvents }
                  </div>
                )
              })
            }
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
