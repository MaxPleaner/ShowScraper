class InitialMigration < ActiveRecord::Migration[7.0]
  def change
    create_table :venues do |t|
      t.string :name
      t.string :location
    end
    create_table :events do |t|
      t.string :name
      t.text :description
      t.datetime :time
      t.references :venue
      t.text :image_url
      t.text :details_url
    end
  end
end
