const { closeDatabase } = require("./helpers/testDb");

module.exports = async () => {
  await closeDatabase();
};
