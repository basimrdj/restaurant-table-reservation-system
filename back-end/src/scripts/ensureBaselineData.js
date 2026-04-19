"use strict";

const db = require("../db/models");
const logger = require("../utils/logger");

const DEFAULT_OPERATING_HOURS = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  closeTime: "24:00:00",
  dayOfWeek,
  isClosed: false,
  openTime: "13:00:00",
}));

const DEFAULT_TABLES = [
  { area: "indoor", capacity: 2, notes: "Baseline Kaya indoor table.", tableName: "I1" },
  { area: "indoor", capacity: 2, notes: "Baseline Kaya indoor table.", tableName: "I2" },
  { area: "indoor", capacity: 4, notes: "Baseline Kaya indoor table.", tableName: "I3" },
  { area: "indoor", capacity: 4, notes: "Baseline Kaya indoor table.", tableName: "I4" },
  {
    area: "indoor_rooftop",
    capacity: 2,
    notes: "Baseline Kaya indoor rooftop table.",
    tableName: "IR1",
  },
  {
    area: "indoor_rooftop",
    capacity: 4,
    notes: "Baseline Kaya indoor rooftop table.",
    tableName: "IR2",
  },
  {
    area: "indoor_rooftop",
    capacity: 6,
    notes: "Baseline Kaya indoor rooftop table.",
    tableName: "IR3",
  },
  {
    area: "outdoor_rooftop",
    capacity: 2,
    notes: "Baseline Kaya outdoor rooftop table.",
    tableName: "OR1",
  },
  {
    area: "outdoor_rooftop",
    capacity: 4,
    notes: "Baseline Kaya outdoor rooftop table.",
    tableName: "OR2",
  },
  {
    area: "outdoor_rooftop",
    capacity: 6,
    notes: "Baseline Kaya outdoor rooftop table.",
    tableName: "OR3",
  },
];

async function ensureOperatingHours() {
  for (const item of DEFAULT_OPERATING_HOURS) {
    await db.operatingHour.findOrCreate({
      defaults: item,
      where: { dayOfWeek: item.dayOfWeek },
    });
  }
}

async function ensureTables() {
  for (const item of DEFAULT_TABLES) {
    await db.table.findOrCreate({
      defaults: {
        ...item,
        isActive: true,
      },
      where: { tableName: item.tableName },
    });
  }
}

async function main() {
  try {
    await db.sequelize.authenticate();
    await ensureOperatingHours();
    await ensureTables();
    logger.info(
      JSON.stringify({
        baseline_tables: DEFAULT_TABLES.length,
        baseline_weekly_hours: DEFAULT_OPERATING_HOURS.length,
        event: "baseline_data_seeded",
        timestamp: new Date().toISOString(),
      }),
    );
  } catch (error) {
    logger.error(
      `Failed to ensure baseline Railway data: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
}

void main();
