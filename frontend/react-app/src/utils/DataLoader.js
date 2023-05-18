import moment from 'moment';
import _ from 'underscore';
import $ from 'jquery';

export default class DataLoader {
  static async loadVenueData() {
    const data = await $.getJSON("https://storage.googleapis.com/show-scraper-data/sources.json", { _: new Date().getTime()})
    return data
  }

  static async loadEventData(venues) {
    const results = []
    for (let venue of venues) {
      const url = `https://storage.googleapis.com/show-scraper-data/${venue.name}.json`
      const events = await $.ajax({
        cache: false,
        url: url,
        dataType: "json",
      });
      events.forEach((event) => {
        // This is a special case where the provided venue name "The List" is not really accurate.
        // So we do some manipulation here.
        if (venue.name == "TheList" || venue.name == "ManuallyAdded") {
          const data = JSON.parse(event.title);
          venue = { ...venue, commonName: `${data.venue} (via ${venue.commonName})` }
          event.title = data.artists
          // debugger
        }
        let newEvent = {
          ...event,
          source: venue
        }
        results.push(newEvent)
      })
    }
    return _.groupBy(results, (event) => {
      let date = moment(event.date, 'YYYY-MM-DD')

      // Intentionally omitting year here.
      // Some scraped data does not have accurate year numbers,
      // which can cause issues around December / January time,
      // since january events might show up for the PREVIOUS year
      return date.format('MM-DD')
    })
  }

}
