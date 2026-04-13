import API from "./API";

class SettingsAPI {
  getSettings() {
    return API().get("/settings");
  }

  getOperatingHours() {
    return API().get("/operating-hours");
  }

  updateOperatingHours(items) {
    return API().put("/operating-hours", { items });
  }
}

export default new SettingsAPI();
