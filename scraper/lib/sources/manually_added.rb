class ManuallyAdded

  def self.run(events_limit: 0, &foreach_event_blk)
    return [
      # {
      #   url: "https://lh3.googleusercontent.com/pw/AJFCJaWdEwKVNXKhm1dNmARRslQAqqhJyIUbJ93Ao3-8x3K-UdOrK3l1LuxjmCrJ1jW8TIdBxhu9yzc40nieSWMpz14caAcyUvSNrzgQ4xraWBDuJAv1X39UdupxgtDFL30p00dFZx62hD0V8OrOuyo6hSSFSA=w707-h884-s-no?authuser=0",
      #   img: "https://lh3.googleusercontent.com/pw/AJFCJaWdEwKVNXKhm1dNmARRslQAqqhJyIUbJ93Ao3-8x3K-UdOrK3l1LuxjmCrJ1jW8TIdBxhu9yzc40nieSWMpz14caAcyUvSNrzgQ4xraWBDuJAv1X39UdupxgtDFL30p00dFZx62hD0V8OrOuyo6hSSFSA=w707-h884-s-no?authuser=0",
      #   date: DateTime.parse("May 19 2023"),
      #   title: {
      #     artists: "AAPI Goth Gala - Music, Drag, and Vendors. Half Rotten Goddess, Pretty Frankenstein, Space Kadets, Drag Performers",
      #     venue: "The Red Door in Alameda - 2309 Encinal Ave"
      #   }.to_json,
      #   details: ""
      # }
    ].map do |event|
      event.
        tap { |data| Utils.print_event_preview(self, data) }.
        tap { |data| foreach_event_blk&.call(data) }
    end
  end
end
