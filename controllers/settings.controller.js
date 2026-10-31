import { Settings } from "../models/Settings.js";

async function getOrCreateSettings() {
  let settings = await Settings.findOne({ key: "app" });
  if (!settings) {
    settings = await Settings.create({
      key: "app",
      deliveryCharges: 0,
      freeShippingMinOrder: 0,
    });
  }
  return settings;
}

/** Public — website checkout */
export async function getPublicSettings(req, res, next) {
  try {
    const settings = await getOrCreateSettings();
    res.json({
      deliveryCharges: settings.deliveryCharges,
      freeShippingMinOrder: settings.freeShippingMinOrder,
    });
  } catch (error) {
    next(error);
  }
}

/** Admin — full settings */
export async function getSettings(req, res, next) {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
}

/** Admin — update delivery charges */
export async function updateSettings(req, res, next) {
  try {
    const { deliveryCharges, freeShippingMinOrder } = req.body;

    if (
      deliveryCharges !== undefined &&
      (Number.isNaN(Number(deliveryCharges)) || Number(deliveryCharges) < 0)
    ) {
      return res.status(400).json({ message: "Invalid delivery charges" });
    }

    if (
      freeShippingMinOrder !== undefined &&
      (Number.isNaN(Number(freeShippingMinOrder)) ||
        Number(freeShippingMinOrder) < 0)
    ) {
      return res.status(400).json({ message: "Invalid free shipping minimum" });
    }

    const settings = await getOrCreateSettings();

    if (deliveryCharges !== undefined) {
      settings.deliveryCharges = Number(deliveryCharges);
    }
    if (freeShippingMinOrder !== undefined) {
      settings.freeShippingMinOrder = Number(freeShippingMinOrder);
    }

    await settings.save();
    res.json(settings);
  } catch (error) {
    next(error);
  }
}
