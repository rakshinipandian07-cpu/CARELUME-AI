
const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    patientName: { type: String, default: "" },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "Pending Approval",
        "Confirmed",
        "Scheduled",
        "Reschedule Proposed",
        "Completed",
        "Cancelled",
      ],
      default: "Pending Approval",
    },
    reason: { type: String, default: "" },
    notes: { type: String, default: "" },
    requestedBy: {
      type: String,
      enum: ["patient", "staff"],
      default: "patient",
    },
    proposedDate: { type: String, default: "" },
    proposedTime: { type: String, default: "" },
    staffMessage: { type: String, default: "" },
    declineReason: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);

