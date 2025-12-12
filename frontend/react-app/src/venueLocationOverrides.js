// Hard-coded location overrides for venues without lat/lng in venues.json
// Format: { lookup: (commonName) => boolean, location: "lat,lng" }
// The lookup function receives event.source.commonName and should return true if it matches

export const VENUE_LOCATION_OVERRIDES = [
  // East Bay
  { lookup: (name) => name.includes("924 GILMAN") && name.includes("BERKELEY"), location: "37.8716,-122.3012" }, // TODO
  { lookup: (name) => name.includes("LONG HAUL") && name.includes("BERKELEY"), location: "37.8716,-122.2700" }, // TODO
  { lookup: (name) => name.includes("FIRST CHURCH") && name.includes("BUZZARD"), location: "37.8044,-122.2712" }, // TODO
  { lookup: (name) => name.includes("HESHER") && name.includes("PIZZA"), location: "37.8044,-122.2712" }, // TODO
  { lookup: (name) => name.includes("STAY GOLD DELI"), location: "37.8044,-122.2712" }, // TODO
  { lookup: (name) => name.includes("UP THE CREEK") && name.includes("WALNUT CREEK"), location: "37.9101,-122.0652" }, // TODO
  { lookup: (name) => name.includes("DOWN HOME MUSIC") && name.includes("EL CERRITO"), location: "37.9024,-122.3175" }, // TODO
  { lookup: (name) => name.includes("FIFTY") && name.includes("LIQUOR") && name.includes("HAYWARD"), location: "37.6688,-122.0808" }, // TODO

  // San Francisco
  { lookup: (name) => name.includes("BLACK CAT") && name.includes("S.F"), location: "37.7749,-122.4194" }, // TODO
  { lookup: (name) => name.includes("KILOWATT") && name.includes("S.F"), location: "37.7749,-122.4194" }, // TODO
  { lookup: (name) => name.includes("PEACOCK LOUNGE"), location: "37.7749,-122.4194" }, // TODO
  { lookup: (name) => name.includes("4-STAR THEATER"), location: "37.7749,-122.4194" }, // TODO
  { lookup: (name) => name.includes("PRETTY GRITTY"), location: "37.7749,-122.4194" }, // TODO
  { lookup: (name) => name.includes("PUBLIC WORKS") && name.includes("S.F"), location: "37.7749,-122.4194" }, // TODO
  { lookup: (name) => name.includes("THRILLHOUSE"), location: "37.7749,-122.4194" }, // TODO

  // South Bay
  { lookup: (name) => name.includes("GUILD THEATER") && name.includes("MEMLO PARK"), location: "37.4500,-122.1600" }, // TODO
  { lookup: (name) => name.includes("RITZ") && name.includes("SAN JOSE"), location: "37.3382,-121.8863" }, // TODO
  { lookup: (name) => name.includes("CARAVAN LOUNGE"), location: "37.3382,-121.8863" }, // TODO
  { lookup: (name) => name.includes("SAN JOSE CIVIC"), location: "37.3382,-121.8863" }, // TODO
  { lookup: (name) => name.includes("QUARTER NOTE") && name.includes("SUNNYVALE"), location: "37.3688,-122.0363" }, // TODO

  // North Bay
  { lookup: (name) => name.includes("BLUE NOTE") && name.includes("NAPA"), location: "38.2975,-122.2869" }, // TODO
  { lookup: (name) => name.includes("TAQUERIA MILA") && name.includes("SANTA ROSA"), location: "38.4404,-122.7141" }, // TODO
  { lookup: (name) => name.includes("120 FIFTH") && name.includes("SANTA ROSA"), location: "38.4404,-122.7141" }, // TODO
  { lookup: (name) => name.includes("HOPMONK") && name.includes("SEBASTOPOL"), location: "38.4020,-122.8238" }, // TODO
  { lookup: (name) => name.includes("PHOENIX THEATER") && name.includes("PETALUMA"), location: "38.2324,-122.6367" }, // TODO
  { lookup: (name) => name.includes("HOPMONK") && name.includes("NOVATO"), location: "38.1074,-122.5697" }, // TODO
  { lookup: (name) => name.includes("UPTOWN THEATER") && name.includes("NAPA"), location: "38.2975,-122.2869" }, // TODO

  // Santa Cruz
  { lookup: (name) => name.includes("BLUE LAGOON") && name.includes("SANTA CRUZ"), location: "36.9741,-122.0308" }, // TODO
  { lookup: (name) => name.includes("MOE'S ALLEY"), location: "36.9741,-122.0308" }, // TODO
  { lookup: (name) => name.includes("SUBROSA") && name.includes("SANTA CRUZ"), location: "36.9741,-122.0308" }, // TODO
  { lookup: (name) => name.includes("CATALYST") && name.includes("SANTA CRUZ"), location: "36.9741,-122.0308" }, // TODO
  { lookup: (name) => name.includes("JURY ROOM") && name.includes("SANTA CRUZ"), location: "36.9741,-122.0308" }, // TODO
  { lookup: (name) => name.includes("STREETLIGHT") && name.includes("SANTA CRUZ"), location: "36.9741,-122.0308" }, // TODO

  // Other
  { lookup: (name) => name.includes("TAMARACK"), location: "37.7749,-122.4194" }, // TODO
];