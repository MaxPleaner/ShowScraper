class ManuallyAdded

  def self.run(events_limit: 0, &foreach_event_blk)
    return [
      {
        url: "https://photos.app.goo.gl/aDDR42x8eP88cuL3A",
        img: "https://photos.app.goo.gl/aDDR42x8eP88cuL3A",
        date: DateTime.parse("May 19 2023"),
        title: {
          artists: "AAPI Goth Gala - Music, Drag, and Vendors. Half Rotten Goddess, Pretty Frankenstein, Space Kadets, Drag Performers",
          venue: "The Red Door in Alameda - 2309 Encinal Ave"
        }.to_json,
        details: ""
      }
    ].map do |event|
      event.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end
  end
end
