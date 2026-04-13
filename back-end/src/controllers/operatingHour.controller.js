const operatingHoursService = require("../services/operatingHoursService");

const listHandler = async (req, res) => {
  const hours = await operatingHoursService.listOperatingHours();

  return res.status(200).json({
    success: true,
    collection: hours,
  });
};

const updateHandler = async (req, res) => {
  const hours = await operatingHoursService.updateOperatingHours(req.body.items);

  return res.status(200).json({
    success: true,
    collection: hours,
  });
};

module.exports = {
  listHandler,
  updateHandler,
};
