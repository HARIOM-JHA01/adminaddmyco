import AdvertisementRateModel from "../Models/AdvertisementRate.js";

export const initializeDefaultRates = async () => {
  try {
    const positions = ["HOME_BANNER", "BOTTOM_CIRCLE"];

    for (const position of positions) {
      const existingRate = await AdvertisementRateModel.findOne({ position });

      if (!existingRate) {
        await AdvertisementRateModel.create({
          position,
          displayCreditRate: 1000,
          description: `Display credit rate for ${
            position === "HOME_BANNER" ? "Home Banner" : "Bottom Circle"
          }`,
          isActive: true,
        });
        console.log(`Created default rate for ${position}`);
      }
    }
  } catch (error) {
    console.error("Error initializing advertisement rates:", error);
  }
};
