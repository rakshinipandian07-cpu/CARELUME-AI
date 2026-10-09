const express = require("express");
const mongoose = require("mongoose");
const SupportTicket = require("../models/SupportTicket");
const Patient = require("../models/Patient");
const { auth, allowRoles } = require("../middleware/auth");
const { createNotification } = require("../services/notificationService");

const router = express.Router();

const VALID_CATEGORIES = [
  "Appointment Assistance",
  "Document Assistance",
  "Account/Login Help",
  "General Clinic Query",
  "General",
];

// 1. Get support tickets (Patient gets own, Staff gets all)
router.get("/", auth, async (req, res) => {
  try {
    const filter =
      req.user.role === "patient"
        ? { patientId: req.user.patientId }
        : {};

    const tickets = await SupportTicket.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    // Attach patient details for staff if needed
    if (req.user.role === "staff") {
      const patientIds = [...new Set(tickets.map((t) => t.patientId).filter(Boolean))];
      const patients = await Patient.find(
        { patientId: { $in: patientIds } },
        { patientId: 1, name: 1, email: 1 }
      ).lean();
      const patientMap = new Map(patients.map((p) => [p.patientId, p]));

      tickets.forEach((t) => {
        if (!t.patientName && t.patientId && patientMap.has(t.patientId)) {
          t.patientName = patientMap.get(t.patientId).name;
        }
      });
    }

    return res.json(tickets);
  } catch (error) {
    console.error("Ticket fetch failed:", error.message);
    return res.status(500).json({
      message: "Could not load tickets.",
    });
  }
});

// 2. Get single ticket by ID
router.get("/:id", auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid ticket ID." });
    }

    const ticket = await SupportTicket.findById(req.params.id).lean();
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    if (
      req.user.role === "patient" &&
      ticket.patientId &&
      ticket.patientId !== req.user.patientId
    ) {
      return res.status(403).json({
        message: "You can only view your own support tickets.",
      });
    }

    return res.json(ticket);
  } catch (error) {
    console.error("Single ticket fetch failed:", error.message);
    return res.status(500).json({ message: "Could not load ticket details." });
  }
});

// 3. Create Support Ticket (Patient or Staff)
router.post("/", auth, async (req, res) => {
  try {
    const {
      question,
      message,
      subject,
      category,
      patientId: targetPatientId,
    } = req.body || {};

    const textContent = (question || message || "").trim();

    if (!textContent) {
      return res.status(400).json({
        message: "Please provide your question or message description.",
      });
    }

    let patientId = null;
    let patientName = "";

    if (req.user.role === "patient") {
      patientId = req.user.patientId;
      const patient = await Patient.findOne({ patientId });
      patientName = patient?.name || req.user.name || "Patient";
    } else {
      patientId = targetPatientId ? targetPatientId.trim().toUpperCase() : null;
      if (patientId) {
        const patient = await Patient.findOne({ patientId });
        patientName = patient?.name || "";
      }
    }

    const assignedCategory =
      category && VALID_CATEGORIES.includes(category.trim())
        ? category.trim()
        : "General Clinic Query";

    const assignedSubject = subject && subject.trim()
      ? subject.trim()
      : `${assignedCategory} Inquiry`;

    const initialMessage = {
      sender: req.user.role === "staff" ? "staff" : "patient",
      senderName: patientName || (req.user.role === "staff" ? "Clinic Staff" : "Patient"),
      text: textContent,
      createdAt: new Date(),
    };

    const ticket = await SupportTicket.create({
      patientId,
      patientName,
      subject: assignedSubject,
      category: assignedCategory,
      question: textContent,
      status: "Open",
      assignedTo: "Clinic Staff",
      messages: [initialMessage],
    });

    // Notify clinic staff if submitted by patient
    if (req.user.role === "patient") {
      await createNotification({
        recipientRole: "staff",
        type: "ticket",
        title: "New Patient Support Ticket",
        message: `${patientName} (${patientId}): "${assignedSubject}" - ${textContent.slice(0, 60)}...`,
        link: "/staff/tickets",
      });
    }

    return res.status(201).json(ticket);
  } catch (error) {
    console.error("Ticket creation failed:", error.message);
    return res.status(500).json({ message: "Could not create ticket." });
  }
});

// 4. Send a Reply / Message on a Ticket
router.post("/:id/reply", auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid ticket ID." });
    }

    const { message, text, status } = req.body || {};
    const replyText = (message || text || "").trim();

    if (!replyText) {
      return res.status(400).json({ message: "Message content cannot be empty." });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    // Patient isolation check
    if (
      req.user.role === "patient" &&
      ticket.patientId &&
      ticket.patientId !== req.user.patientId
    ) {
      return res.status(403).json({
        message: "You can only reply to your own support tickets.",
      });
    }

    const senderRole = req.user.role === "staff" ? "staff" : "patient";
    const senderName =
      senderRole === "staff"
        ? req.user.name || "Clinic Staff"
        : ticket.patientName || "Patient";

    const newMsg = {
      sender: senderRole,
      senderName,
      text: replyText,
      createdAt: new Date(),
    };

    ticket.messages.push(newMsg);

    // If staff replies, optionally update status
    if (senderRole === "staff") {
      if (status && ["Open", "In Progress", "Resolved"].includes(status)) {
        ticket.status = status;
      } else if (ticket.status === "Open") {
        ticket.status = "In Progress";
      }
    } else {
      // If patient replies to a resolved ticket, reopen it
      if (ticket.status === "Resolved") {
        ticket.status = "Open";
      }
    }

    await ticket.save();

    // Send notifications
    if (senderRole === "staff" && ticket.patientId) {
      await createNotification({
        recipientRole: "patient",
        patientId: ticket.patientId,
        type: "ticket",
        title: "New Response to Your Support Ticket",
        message: `Staff replied to "${ticket.subject || ticket.question.slice(0, 30)}...": "${replyText.slice(0, 70)}..."`,
        link: "/patient/tickets",
      });
    } else if (senderRole === "patient") {
      await createNotification({
        recipientRole: "staff",
        type: "ticket",
        title: "Patient Replied to Ticket",
        message: `Patient ${ticket.patientName || ticket.patientId} replied on ticket #${ticket._id.toString().slice(-6)}: "${replyText.slice(0, 60)}..."`,
        link: "/staff/tickets",
      });
    }

    return res.json({
      message: "Reply sent successfully.",
      ticket,
    });
  } catch (error) {
    console.error("Ticket reply failed:", error.message);
    return res.status(500).json({ message: "Failed to send ticket reply." });
  }
});

// 5. Update ticket status (staff only)
router.patch(
  "/:id/status",
  auth,
  allowRoles("staff"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: "Invalid ticket ID.",
        });
      }

      const allowedStatuses = ["Open", "In Progress", "Resolved"];

      if (
        typeof req.body?.status !== "string" ||
        !allowedStatuses.includes(req.body.status)
      ) {
        return res.status(400).json({
          message: "Invalid ticket status.",
        });
      }

      const ticket = await SupportTicket.findByIdAndUpdate(
        req.params.id,
        { $set: { status: req.body.status } },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!ticket) {
        return res.status(404).json({
          message: "Ticket not found.",
        });
      }

      // Notify patient if ticket has associated patientId
      if (ticket.patientId) {
        await createNotification({
          recipientRole: "patient",
          patientId: ticket.patientId,
          type: "ticket",
          title: `Support Ticket ${ticket.status}`,
          message: `Your inquiry "${ticket.subject || ticket.question.slice(0, 30)}" has been marked as "${ticket.status}".`,
          link: "/patient/tickets",
        });
      }

      return res.json(ticket);
    } catch (error) {
      console.error("Ticket update failed:", error.message);
      return res.status(500).json({
        message: "Could not update ticket.",
      });
    }
  }
);

module.exports = router;

