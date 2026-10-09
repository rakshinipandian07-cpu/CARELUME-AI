const express = require("express");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Get notifications for current user
router.get("/", auth, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "staff") {
      filter = {
        $or: [
          { recipientRole: "staff" },
          { recipientRole: "all" },
          { recipientUser: req.user._id },
        ],
      };
    } else {
      // Patient
      filter = {
        $or: [
          { patientId: req.user.patientId },
          { recipientUser: req.user._id },
          { recipientRole: "patient", patientId: req.user.patientId },
        ],
      };
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json(notifications);
  } catch (error) {
    console.error("Notifications fetch failed:", error.message);
    return res.status(500).json({
      message: "Could not load notifications.",
    });
  }
});

// Mark single notification as read
router.patch("/:id/read", auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid notification ID." });
    }

    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    // Check authorization: patient can only mark their own notifications
    if (
      req.user.role === "patient" &&
      notification.patientId &&
      notification.patientId !== req.user.patientId
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    return res.json(notification);
  } catch (error) {
    console.error("Notification mark read failed:", error.message);
    return res.status(500).json({ message: "Could not update notification." });
  }
});

// Mark all as read
router.patch("/read-all", auth, async (req, res) => {
  try {
    let filter = { read: false };

    if (req.user.role === "staff") {
      filter.$or = [
        { recipientRole: "staff" },
        { recipientRole: "all" },
        { recipientUser: req.user._id },
      ];
    } else {
      filter.$or = [
        { patientId: req.user.patientId },
        { recipientUser: req.user._id },
      ];
    }

    await Notification.updateMany(filter, {
      $set: { read: true, readAt: new Date() },
    });

    return res.json({ success: true, message: "All notifications marked as read." });
  } catch (error) {
    console.error("Notifications mark all read failed:", error.message);
    return res.status(500).json({ message: "Could not mark all notifications as read." });
  }
});

module.exports = router;
