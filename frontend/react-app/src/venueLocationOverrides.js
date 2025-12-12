// Hard-coded location overrides for venues without lat/lng in venues.json
// Format: "VENUE NAME": "lat,lng"
// Use exact venue name as it appears in event.source.name

export const VENUE_LOCATION_OVERRIDES = {
  // East Bay
  "924 GILMAN STREET, BERKELEY (via The List)": "37.8716,-122.3012", // TODO: Replace with actual coordinates
  "LONG HAUL INFOSHOP, 3124 SHATTUCK AVE., BERKELEY (via The List)": "37.8716,-122.2700", // TODO: Replace with actual coordinates

  // San Francisco
  "BLACK CAT, S.F. (via The List)": "37.7749,-122.4194", // TODO: Replace with actual coordinates
  "KILOWATT, S.F. (via The List)": "37.7749,-122.4194", // TODO: Replace with actual coordinates
  "PEACOCK LOUNGE, S.F. (via The List)": "37.7749,-122.4194", // TODO: Replace with actual coordinates
  "4-STAR THEATER, S.F. (via The List)": "37.7749,-122.4194", // TODO: Replace with actual coordinates
  "PRETTY GRITTY, 428 3RD STREET, S.F. (via The List)": "37.7749,-122.4194", // TODO: Replace with actual coordinates
  "PUBLIC WORKS, S.F. (via The List)": "37.7749,-122.4194", // TODO: Replace with actual coordinates

  // South Bay
  "GUILD THEATER, MEMLO PARK (via The List)": "37.4500,-122.1600", // TODO: Replace with actual coordinates
  "RITZ, SAN JOSE (via The List)": "37.3382,-121.8863", // TODO: Replace with actual coordinates

  // North Bay
  "BLUE NOTE, NAPA (via The List)": "38.2975,-122.2869", // TODO: Replace with actual coordinates
  "TAQUERIA MILA, 100 BURT STREET, SANTA ROSA (via The List)": "38.4404,-122.7141", // TODO: Replace with actual coordinates
  "120 FIFTH STREET, SANTA ROSA (via The List)": "38.4404,-122.7141", // TODO: Replace with actual coordinates
  "HOPMONK TAVERN, SEBASTOPOL (via The List)": "38.4020,-122.8238", // TODO: Replace with actual coordinates
  "PHOENIX THEATER, PETALUMA (via The List)": "38.2324,-122.6367", // TODO: Replace with actual coordinates

  // Santa Cruz
  "BLUE LAGOON, SANTA CRUZ (via The List)": "36.9741,-122.0308", // TODO: Replace with actual coordinates
  "MOE'S ALLEY, SANTA CRUZ (via The List)": "36.9741,-122.0308", // TODO: Replace with actual coordinates
  "SUBROSA COMMUNITY SPACE, SANTA CRUZ (via The List)": "36.9741,-122.0308", // TODO: Replace with actual coordinates
  "CATALYST, SANTA CRUZ (via The List)": "36.9741,-122.0308", // TODO: Replace with actual coordinates
  "JURY ROOM, SANTA CRUZ (via The List)": "36.9741,-122.0308", // TODO: Replace with actual coordinates

  // Other
  "TAMARACK, (via The List)": "37.7749,-122.4194", // TODO: Replace with actual coordinates
};