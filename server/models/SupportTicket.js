
const mongoose = require("mongoose");

const ticketMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["patient", "staff"],
      required: true,
    },
    senderName: { type: String, default: "" },
    text: { type: String, required: true },
    attachmentUrl: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ticketSchema = new mongoose.Schema(
  {
    patientId: { type: String, default: null, index: true },
    patientName: { type: String, default: "" },
    subject: { type: String, default: "" },
    category: {
      type: String,
      enum: [
        "Appointment Assistance",
        "Document Assistance",
        "Account/Login Help",
        "General Clinic Query",
        "General",
      ],
      default: "General Clinic Query",
    },
    question: { type: String, required: true },
    assignedTo: { type: String, default: "Clinic Staff" },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved"],
      default: "Open",
    },
    messages: [ticketMessageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("SupportTicket", ticketSchema);

