const db = require("../../db/models");

const seedOperatingHours = async () => {
  const rows = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    openTime: "13:00:00",
    closeTime: "24:00:00",
    isClosed: false,
  }));

  await db.operatingHour.bulkCreate(rows);
};

const resetDatabase = async () => {
  await db.sequelize.sync({ force: true });
  await seedOperatingHours();
};

const closeDatabase = async () => {
  await db.sequelize.close();
};

const futureDate = (daysAhead = 1) => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
};

module.exports = {
  closeDatabase,
  db,
  futureDate,
  resetDatabase,
};
