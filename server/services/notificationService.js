const Notification = require("../models/Notification");

/**
 * Create an in-app notification and optionally trigger email/logging.
 */
async function createNotification({
  recipientRole,
  recipientUser = null,
  patientId = null,
  type = "general",
  title,
  message,
  link = null,
}) {
  try {
    if (!recipientRole || !title || !message) {
      return null;
    }

    const notification = await Notification.create({
      recipientRole,
      recipientUser,
      patientId,
      type,
      title,
      message,
      link,
    });

    return notification;
  } catch (err) {
    console.error("Failed to create notification:", err.message);
    return null;
  }
}

module.exports = {
  createNotification,
};
