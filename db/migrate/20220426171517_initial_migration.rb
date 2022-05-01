class InitialMigration < ActiveRecord::Migration[7.0]
  def change
    create_table :venues do |t|
      t.string :name
      t.string :location
    end
    create_table :events do |t|
      t.string :title
      t.text :details
      t.datetime :date
      t.references :venue
      t.text :img
      t.text :url
    end
  end
end
