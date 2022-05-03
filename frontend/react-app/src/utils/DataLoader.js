import moment from 'moment';
import _ from 'underscore';
import $ from 'jquery';

export default class DataLoader {
  static async loadVenueData() {
    const data = await $.getJSON("http://storage.googleapis.com/show-scraper-data/sources.json", { _: new Date().getTime()})
    return data
  }

  static async loadEventData(venues) {
    const results = []
    for (const venue of venues) {
      const url = `http://storage.googleapis.com/show-scraper-data/${venue.name}.json`
      const events = await $.getJSON(url);
      events.forEach((event) => {
        let newEvent = {
          ...event,
          source: venue
        }
        results.push(newEvent)
      })
    }
    return _.groupBy(results, (event) => {
      let date = moment(event.date, 'YYYY-MM-DD')
      return date.format('MM-DD-YYYY')
    })
  }

}
