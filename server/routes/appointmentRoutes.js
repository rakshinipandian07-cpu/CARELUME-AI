const express = require("express");
const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const { auth, allowRoles } = require("../middleware/auth");
const { createNotification } = require("../services/notificationService");

const router = express.Router();

/**
 * Helper: Validate YYYY-MM-DD date and ensure it is not in the past
 */
function isValidFutureDate(dateStr) {
  if (typeof dateStr !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return false;

  const parsed = new Date(`${dateStr.trim()}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  if (parsed.toISOString().slice(0, 10) !== dateStr.trim()) return false;

  // Check not before today in local calendar
  const todayStr = new Date().toISOString().slice(0, 10);
  return dateStr.trim() >= todayStr;
}

/**
 * Helper: Validate time slot format (e.g. "09:00 AM", "10:30 AM", "02:15 PM")
 */
function isValidTimeSlot(timeStr) {
  if (typeof timeStr !== "string") return false;
  return /^(0?[1-9]|1[0-2]):[0-5]\d (AM|PM)$/i.test(timeStr.trim());
}

// 1. Get appointments (Patient gets own, Staff gets all)
router.get("/", auth, async (req, res) => {
  try {
    const filter =
      req.user.role === "patient"
        ? { patientId: req.user.patientId }
        : {};

    const appointments = await Appointment.find(filter)
      .sort({ date: 1, time: 1 })
      .lean();

    // Attach patient names for staff view if missing
    if (req.user.role === "staff") {
      const patientIds = [...new Set(appointments.map((a) => a.patientId))];
      const patients = await Patient.find(
        { patientId: { $in: patientIds } },
        { patientId: 1, name: 1, email: 1, phone: 1 }
      ).lean();
      const patientMap = new Map(patients.map((p) => [p.patientId, p]));

      appointments.forEach((apt) => {
        if (!apt.patientName && patientMap.has(apt.patientId)) {
          apt.patientName = patientMap.get(apt.patientId).name;
        }
      });
    }

    return res.json(appointments);
  } catch (error) {
    console.error("Appointment fetch failed:", error.message);
    return res.status(500).json({
      message: "Could not load appointments.",
    });
  }
});

// 2. Patient Book Appointment Request (POST /api/appointments/book)
router.post("/book", auth, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        message: "Only patients can book appointment requests via this endpoint.",
      });
    }

    const { date, time, reason, notes } = req.body || {};

    if (!date || !time) {
      return res.status(400).json({
        message: "Please provide both a preferred appointment date and time slot.",
      });
    }

    if (!isValidFutureDate(date)) {
      return res.status(400).json({
        message: "Please choose a valid future appointment date (YYYY-MM-DD).",
      });
    }

    if (!isValidTimeSlot(time)) {
      return res.status(400).json({
        message: "Please select a valid time slot (e.g. 09:30 AM).",
      });
    }

    const patientId = req.user.patientId;
    const patient = await Patient.findOne({ patientId });
    const patientName = patient?.name || req.user.name || "Patient";

    // Prevent duplicate pending request for the exact same date & time by the same patient
    const existingPending = await Appointment.findOne({
      patientId,
      date: date.trim(),
      time: time.trim().toUpperCase(),
      status: { $in: ["Pending Approval", "Confirmed", "Scheduled"] },
    });

    if (existingPending) {
      return res.status(400).json({
        message: `You already have an appointment or pending request on ${date} at ${time.trim().toUpperCase()}.`,
      });
    }

    const appointment = await Appointment.create({
      patientId,
      patientName,
      date: date.trim(),
      time: time.trim().toUpperCase(),
      status: "Pending Approval",
      reason: reason ? reason.trim() : "",
      notes: notes ? notes.trim() : "",
      requestedBy: "patient",
    });

    // Notify Clinic Staff
    await createNotification({
      recipientRole: "staff",
      type: "appointment",
      title: "New Appointment Request",
      message: `${patientName} (${patientId}) requested an appointment on ${date} at ${time.trim().toUpperCase()}${reason ? ` for "${reason.trim()}"` : ""}.`,
      link: "/staff/appointments",
    });

    return res.status(201).json({
      message: "Appointment request submitted successfully. Awaiting clinic approval.",
      appointment,
    });
  } catch (error) {
    console.error("Patient booking failed:", error.message);
    return res.status(500).json({
      message: error.message || "Failed to submit appointment request.",
    });
  }
});

// 3. Staff Direct Appointment Creation (POST /api/appointments)
router.post("/", auth, allowRoles("staff"), async (req, res) => {
  try {
    const { patientId, date, time, reason, notes } = req.body || {};

    if (!patientId || !date || !time) {
      return res.status(400).json({
        message: "Patient ID, date, and time are required.",
      });
    }

    if (!isValidFutureDate(date)) {
      return res.status(400).json({
        message: "Please provide a valid calendar date (YYYY-MM-DD).",
      });
    }

    if (!isValidTimeSlot(time)) {
      return res.status(400).json({
        message: "Time must use a format such as 10:30 AM.",
      });
    }

    const patient = await Patient.findOne({
      patientId: patientId.trim().toUpperCase(),
    });

    if (!patient) {
      return res.status(404).json({
        message: "Patient record not found.",
      });
    }

    const appointment = await Appointment.create({
      patientId: patientId.trim().toUpperCase(),
      patientName: patient.name,
      date: date.trim(),
      time: time.trim().toUpperCase(),
      status: "Confirmed",
      reason: reason ? reason.trim() : "",
      notes: notes ? notes.trim() : "",
      requestedBy: "staff",
    });

    // Notify patient
    await createNotification({
      recipientRole: "patient",
      patientId: patientId.trim().toUpperCase(),
      type: "appointment",
      title: "New Appointment Confirmed",
      message: `Your appointment is confirmed for ${date} at ${time.trim().toUpperCase()}.`,
      link: `/patient/appointments`,
    });

    return res.status(201).json(appointment);
  } catch (error) {
    console.error("Staff appointment creation failed:", error.message);
    return res.status(500).json({
      message: "Could not create appointment.",
    });
  }
});

// 4. Staff Approve Appointment (PATCH /api/appointments/:id/approve)
router.patch("/:id/approve", auth, allowRoles("staff"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid appointment ID." });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    // Availability validation check
    const conflictingConfirmed = await Appointment.findOne({
      _id: { $ne: appointment._id },
      date: appointment.date,
      time: appointment.time,
      status: { $in: ["Confirmed", "Scheduled"] },
    });

    // In a multi-doctor clinic setting, warning or slot limit can apply; let's confirm the appointment
    appointment.status = "Confirmed";
    appointment.proposedDate = "";
    appointment.proposedTime = "";
    appointment.staffMessage = "";
    await appointment.save();

    // Notify patient
    await createNotification({
      recipientRole: "patient",
      patientId: appointment.patientId,
      type: "appointment",
      title: "Appointment Request Approved",
      message: `Your appointment request for ${appointment.date} at ${appointment.time} has been approved and confirmed.`,
      link: "/patient/appointments",
    });

    return res.json({
      message: "Appointment approved successfully.",
      appointment,
    });
  } catch (error) {
    console.error("Approve appointment failed:", error.message);
    return res.status(500).json({ message: "Failed to approve appointment." });
  }
});

// 5. Staff Propose Reschedule (PATCH /api/appointments/:id/propose-reschedule)
router.patch(
  "/:id/propose-reschedule",
  auth,
  allowRoles("staff"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid appointment ID." });
      }

      const { proposedDate, proposedTime, staffMessage } = req.body || {};

      if (!proposedDate || !proposedTime) {
        return res.status(400).json({
          message: "Please specify both a proposed alternative date and time slot.",
        });
      }

      if (!isValidFutureDate(proposedDate)) {
        return res.status(400).json({
          message: "Proposed date must be a valid upcoming date (YYYY-MM-DD).",
        });
      }

      if (!isValidTimeSlot(proposedTime)) {
        return res.status(400).json({
          message: "Proposed time must use a format such as 02:30 PM.",
        });
      }

      const appointment = await Appointment.findByIdAndUpdate(
        req.params.id,
        {
          $set: {
            status: "Reschedule Proposed",
            proposedDate: proposedDate.trim(),
            proposedTime: proposedTime.trim().toUpperCase(),
            staffMessage: staffMessage ? staffMessage.trim() : "",
          },
        },
        { new: true }
      );

      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found." });
      }

      // Notify patient
      await createNotification({
        recipientRole: "patient",
        patientId: appointment.patientId,
        type: "appointment",
        title: "Alternative Appointment Time Suggested",
        message: `Clinic suggested a new time for your appointment: ${proposedDate} at ${proposedTime.trim().toUpperCase()}${staffMessage ? ` (${staffMessage.trim()})` : ""}. Please review and respond.`,
        link: "/patient/appointments",
      });

      return res.json({
        message: "Alternative date and time proposed to the patient.",
        appointment,
      });
    } catch (error) {
      console.error("Propose reschedule failed:", error.message);
      return res.status(500).json({ message: "Failed to propose reschedule." });
    }
  }
);

// 6. Patient Respond to Reschedule (PATCH /api/appointments/:id/respond-reschedule)
router.patch("/:id/respond-reschedule", auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid appointment ID." });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    // Patient access isolation check
    if (
      req.user.role === "patient" &&
      appointment.patientId !== req.user.patientId
    ) {
      return res.status(403).json({
        message: "You can only respond to your own appointments.",
      });
    }

    const { action, date, time, notes } = req.body || {};

    if (action === "accept") {
      if (!appointment.proposedDate || !appointment.proposedTime) {
        return res.status(400).json({
          message: "No proposed reschedule time was found on this appointment.",
        });
      }

      appointment.date = appointment.proposedDate;
      appointment.time = appointment.proposedTime;
      appointment.status = "Confirmed";
      appointment.proposedDate = "";
      appointment.proposedTime = "";
      appointment.staffMessage = "";
      await appointment.save();

      // Notify staff
      await createNotification({
        recipientRole: "staff",
        type: "appointment",
        title: "Reschedule Accepted",
        message: `Patient ${appointment.patientName || appointment.patientId} accepted the proposed time: ${appointment.date} at ${appointment.time}.`,
        link: "/staff/appointments",
      });

      return res.json({
        message: "Proposed appointment time accepted and confirmed.",
        appointment,
      });
    } else if (action === "request_new") {
      if (!date || !time) {
        return res.status(400).json({
          message: "Please provide your new preferred date and time.",
        });
      }

      if (!isValidFutureDate(date)) {
        return res.status(400).json({
          message: "Preferred date must be a valid future date (YYYY-MM-DD).",
        });
      }

      if (!isValidTimeSlot(time)) {
        return res.status(400).json({
          message: "Preferred time must use format such as 10:30 AM.",
        });
      }

      appointment.date = date.trim();
      appointment.time = time.trim().toUpperCase();
      appointment.status = "Pending Approval";
      appointment.proposedDate = "";
      appointment.proposedTime = "";
      appointment.staffMessage = "";
      if (notes) appointment.notes = notes.trim();
      await appointment.save();

      // Notify staff
      await createNotification({
        recipientRole: "staff",
        type: "appointment",
        title: "New Appointment Time Requested",
        message: `Patient ${appointment.patientName || appointment.patientId} requested a different time: ${date} at ${time.trim().toUpperCase()}.`,
        link: "/staff/appointments",
      });

      return res.json({
        message: "New preferred time submitted for clinic review.",
        appointment,
      });
    } else {
      return res.status(400).json({
        message: "Action must be either 'accept' or 'request_new'.",
      });
    }
  } catch (error) {
    console.error("Respond reschedule failed:", error.message);
    return res.status(500).json({ message: "Failed to respond to reschedule." });
  }
});

// 7. Staff Decline Appointment Request (PATCH /api/appointments/:id/decline)
router.patch("/:id/decline", auth, allowRoles("staff"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid appointment ID." });
    }

    const { reason } = req.body || {};
    const declineReason = reason ? reason.trim() : "Unable to accommodate requested time slot.";

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: "Cancelled",
          declineReason,
        },
      },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    // Notify patient
    await createNotification({
      recipientRole: "patient",
      patientId: appointment.patientId,
      type: "appointment",
      title: "Appointment Request Declined",
      message: `Your appointment request for ${appointment.date} was declined: "${declineReason}". You can request a new time slot anytime.`,
      link: "/patient/appointments",
    });

    return res.json({
      message: "Appointment request declined and patient notified.",
      appointment,
    });
  } catch (error) {
    console.error("Decline appointment failed:", error.message);
    return res.status(500).json({ message: "Failed to decline appointment." });
  }
});

// 8. General Status Update (Staff only)
router.patch("/:id/status", auth, allowRoles("staff"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid appointment ID." });
    }

    const { status } = req.body || {};
    const allowed = [
      "Pending Approval",
      "Confirmed",
      "Scheduled",
      "Reschedule Proposed",
      "Completed",
      "Cancelled",
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    // Notify patient
    await createNotification({
      recipientRole: "patient",
      patientId: appointment.patientId,
      type: "appointment",
      title: `Appointment ${status}`,
      message: `Your appointment on ${appointment.date} was updated to "${status}".`,
      link: "/patient/appointments",
    });

    return res.json(appointment);
  } catch (error) {
    console.error("Appointment status update failed:", error.message);
    return res.status(500).json({ message: "Could not update appointment." });
  }
});

module.exports = router;

