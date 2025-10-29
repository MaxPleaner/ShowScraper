import moment from 'moment';
import _ from 'underscore';
import $ from 'jquery';

export default class DataLoader {
  static async loadVenueData() {
    const data = await $.getJSON("https://storage.googleapis.com/show-scraper-data/sources.json", { _: new Date().getTime()})
    return data
  }

  static async loadEventData(venues) {
    const fetchEventsPromises = venues.map(venue => {
      const url = `https://storage.googleapis.com/show-scraper-data/${venue.name}.json`;
      return $.ajax({
        cache: false,
        url: url,
        dataType: "json",
      }).then(events => ({ venue, events })); // Pair each venue with its events
    });
  
    const results = [];
  
    const pairedData = await Promise.all(fetchEventsPromises);
  
    pairedData.forEach(({ venue, events }) => {
      events.forEach(event => {
        let modifiedVenue = null;
        if (venue.name === "TheList" || venue.name === "ManuallyAdded") {
          const data = JSON.parse(event.title);
          const commonName = venue.commonName;
          modifiedVenue = { ...venue, commonName: `${data.venue} (via ${commonName})` };
          event.title = data.artists;
        }
  
        let newEvent = {
          ...event,
          source: modifiedVenue || venue
        };
        results.push(newEvent);
      });
    });

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
