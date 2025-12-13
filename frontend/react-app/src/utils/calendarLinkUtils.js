import moment from 'moment';

export const generateCalendarLinks = (event) => {
  const date = moment(event.date, 'YYYY-MM-DD').format('YYYYMMDD');
  const title = encodeURIComponent(`${event.title} at ${event.source.commonName}`);
  const location = encodeURIComponent(event.source.commonName);
  const description = encodeURIComponent(`Event URL: ${event.url}`);

  return {
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&dates=${date}/${date}&text=${title}&location=${location}&details=${description}`,
    ical: `data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:${date}%0ADTEND:${date}%0ASUMMARY:${title}%0ALOCATION:${location}%0ADESCRIPTION:${description}%0AEND:VEVENT%0AEND:VCALENDAR`,
  };
};
