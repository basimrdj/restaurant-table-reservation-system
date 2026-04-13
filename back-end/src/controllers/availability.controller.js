const availabilityService = require("../services/availabilityService");

const checkHandler = async (req, res) => {
  const availability = await availabilityService.checkAvailability(req.body);

  return res.status(200).json({
    success: true,
    item: availability,
  });
};

module.exports = {
  checkHandler,
};
