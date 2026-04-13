const settingsService = require("../services/settingsService");

const getSettingsHandler = async (req, res) => {
  const settings = await settingsService.getSettings();

  return res.status(200).json({
    success: true,
    item: settings,
  });
};

module.exports = {
  getSettingsHandler,
};
