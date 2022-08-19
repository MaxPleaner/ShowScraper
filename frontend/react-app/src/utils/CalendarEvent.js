// Credit: https://jsfiddle.net/UselessCode/qm5AG/ as a starting point
//         https://codepen.io/vlemoine/pen/MLwygX

export default class CalendarEvent {
  static makeIcsFile(date, summary, description) {
    var test =
      "BEGIN:VCALENDAR\n" +
      "CALSCALE:GREGORIAN\n" +
      "METHOD:PUBLISH\n" +
      "PRODID:-//Test Cal//EN\n" +
      "VERSION:2.0\n" +
      "BEGIN:VEVENT\n" +
      "UID:test-1\n" +
      "DTSTART;VALUE=DATE:" +
      convertDate(date.start) +
      "\n" +
      "DTEND;VALUE=DATE:" +
      convertDate(date.end) +
      "\n" +
      "SUMMARY:" +
      summary +
      "\n" +
      "DESCRIPTION:" +
      description +
      "\n" +
      "END:VEVENT\n" +
      "END:VCALENDAR";

    var data = new File([test], { type: "text/plain" });

    // If we are replacing a previously generated file we need to
    // manually revoke the object URL to avoid memory leaks.
    if (icsFile !== null) {
      window.URL.revokeObjectURL(icsFile);
    }

    icsFile = window.URL.createObjectURL(data);

    return icsFile;
  }
}
