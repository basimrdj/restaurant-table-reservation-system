"use strict";

const timestamp = new Date();

const sampleTables = [
  { table_name: "I1", area: "indoor", capacity: 2 },
  { table_name: "I2", area: "indoor", capacity: 2 },
  { table_name: "I3", area: "indoor", capacity: 4 },
  { table_name: "I4", area: "indoor", capacity: 4 },
  { table_name: "IR1", area: "indoor_rooftop", capacity: 2 },
  { table_name: "IR2", area: "indoor_rooftop", capacity: 4 },
  { table_name: "IR3", area: "indoor_rooftop", capacity: 6 },
  { table_name: "OR1", area: "outdoor_rooftop", capacity: 2 },
  { table_name: "OR2", area: "outdoor_rooftop", capacity: 4 },
  { table_name: "OR3", area: "outdoor_rooftop", capacity: 6 },
].map((table) => ({
  ...table,
  is_active: true,
  notes: "Starter sample inventory for local Kaya setup.",
  created_at: timestamp,
  updated_at: timestamp,
}));

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("tables", sampleTables);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("tables", null, {});
  },
};
