import ConfigurationModel from "../Models/Configuration.js";

export async function initializeAdvertisementConfig() {
  try {
    const existing = await ConfigurationModel.findOne({
      ConfigKey: "ADVERTISEMENTS_COUNTRY_FILTER",
    });
    if (!existing) {
      await ConfigurationModel.create({
        ConfigKey: "ADVERTISEMENTS_COUNTRY_FILTER",
        ConfigValue: "1",
      });
      console.log("Initialized ADVERTISEMENTS_COUNTRY_FILTER = 1");
    }
  } catch (e) {
    console.error("Failed to initialize advertisement config:", e);
  }
}
