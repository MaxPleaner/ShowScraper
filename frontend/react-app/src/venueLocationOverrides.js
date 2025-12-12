// Hard-coded location overrides for venues without lat/lng in venues.json
// Format: "VENUE NAME": "lat,lng"
// Use exact venue name as it appears in event.source.name

export const VENUE_LOCATION_OVERRIDES = {
  // East Bay
  "924 GILMAN STREET, BERKELEY (via The List)": "37.8716,-122.3012", // TODO: Replace with actual coordinates

  // San Francisco
  "BLACK CAT, S.F. (via The List)": "37.7749,-122.4194", // TODO: Replace with actual coordinates
  "KILOWATT, S.F. (via The List)": "37.7749,-122.4194", // TODO: Replace with actual coordinates
  "PEACOCK LOUNGE, S.F. (via The List)": "37.7749,-122.4194", // TODO: Replace with actual coordinates

  // North Bay
  "BLUE NOTE, NAPA (via The List)": "38.2975,-122.2869", // TODO: Replace with actual coordinates
  "TAQUERIA MILA, 100 BURT STREET, SANTA ROSA (via The List)": "38.4404,-122.7141", // TODO: Replace with actual coordinates

  // Santa Cruz
  "BLUE LAGOON, SANTA CRUZ (via The List)": "36.9741,-122.0308", // TODO: Replace with actual coordinates
  "MOE'S ALLEY, SANTA CRUZ (via The List)": "36.9741,-122.0308", // TODO: Replace with actual coordinates
  "SUBROSA COMMUNITY SPACE, SANTA CRUZ (via The List)": "36.9741,-122.0308", // TODO: Replace with actual coordinates
};
