require "google/cloud/storage"

class GCS
  cattr_accessor :storage, :bucket_name, :bucket

  self.storage = Google::Cloud::Storage.new
  self.bucket_name = ENV.fetch(ENV["TEST"] == "true" ? "GCS_TEST_BUCKET" : "GCS_BUCKET")
  self.bucket = storage.bucket(bucket_name)

  def self.upload_file(source:, dest:)
    bucket.create_file(source, dest)
  end

  def self.upload_text_as_file(text:, dest:)
    upload_file(source: StringIO.new(text), dest: dest)
  end

  def self.download_file(source:, dest:)
    bucket.file(source).download(dest)
  end

  def self.download_file_as_text(source:)
    temp = Tempfile.new
    download_file(source: source, dest: temp.path)
    temp.read
  end
end
