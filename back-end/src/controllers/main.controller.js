const appSettings = require("../config/appSettings");

const entryHandler = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: `Welcome to the ${appSettings.restaurantName} Reservation System API.`,
  });
};

const infoHandler = async (req, res) => {
  return res.status(200).json({
    success: true,
    item: {
      restaurant_name: appSettings.restaurantName,
      description:
        "Single source of truth for Kaya customers, reservations, tables, closures, hours, and Retell workflows.",
    },
  });
};

module.exports = {
  entryHandler,
  infoHandler,
};
