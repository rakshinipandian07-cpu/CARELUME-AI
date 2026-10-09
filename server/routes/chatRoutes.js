const express = require("express");
const { auth } = require("../middleware/auth");
const Patient = require("../models/Patient");
const SupportTicket = require("../models/SupportTicket");
const answerQuestion = require("../services/aiService");
const { createNotification } = require("../services/notificationService");

const router = express.Router();

router.post("/", auth, async (req, res) => {
  try {
    const { question, patientId: requestedPatientId } = req.body || {};

    if (typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        message: "A question is required.",
      });
    }

    if (question.trim().length > 1000) {
      return res.status(400).json({
        message: "Question must be 1000 characters or fewer.",
      });
    }

    // Patients can only ask about their own record.
    const patientId =
      req.user.role === "patient"
        ? req.user.patientId
        : requestedPatientId;

    if (!patientId || typeof patientId !== "string") {
      return res.status(400).json({
        message: "Please select a valid patient record.",
      });
    }

    // Verify the patient before answering or creating a ticket.
    const patient = await Patient.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({
        message: "Patient record not found.",
      });
    }

    const result = await answerQuestion(question.trim(), patientId);

    if (!result.answered) {
      const ticket = await SupportTicket.create({
        patientId,
        question: question.trim(),
        assignedTo: "Clinic Staff",
        status: "Open",
      });

      // Notify staff
      await createNotification({
        recipientRole: "staff",
        type: "ticket",
        title: "AI Handover Support Ticket",
        message: `Patient ${patient.name} (${patientId}) asked a question requiring staff review: "${question.trim().slice(0, 70)}..."`,
        link: "/staff/tickets",
      });

      return res.status(200).json({
        ...result,
        handover: true,
        ticketId: ticket._id,
      });
    }

    return res.status(200).json({
      ...result,
      handover: false,
    });
  } catch (error) {
    console.error("Chat request failed:", error.message);

    return res.status(500).json({
      message: "Chat request failed. Please try again.",
    });
  }
});

module.exports = router;
