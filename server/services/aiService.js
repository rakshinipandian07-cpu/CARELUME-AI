
const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const Document = require("../models/Document");

async function answerQuestion(question, patientId) {
  const q = question.trim().toLowerCase();

  if (!patientId) {
    return {
      answered: false,
      answer: "Please select a patient record first.",
    };
  }

  // Never use this service to provide medical advice.
  const medicalPattern =
    /\b(symptom|symptoms|pain|bleeding|medicine|medication|dosage|dose|prescription|diagnosis|pregnant|pregnancy|fertility success|treatment advice|side effect|side effects)\b/i;

  if (medicalPattern.test(q)) {
    return {
      answered: false,
      answer:
        "This question needs review by your clinic team. I'll refer it to staff rather than provide medical advice.",
    };
  }

  const patient = await Patient.findOne({ patientId }).lean();

  if (!patient) {
    return {
      answered: false,
      answer: "The selected patient record could not be verified.",
    };
  }

  const asksDocuments =
    /\b(document|documents|paperwork|form|forms|requirement|requirements)\b/i.test(q);

  const asksPending =
    /\b(pending|outstanding|remaining|left to submit|not submitted)\b/i.test(q);

  const asksAppointment =
    /\b(appointment|appointments|next visit|scheduled visit|visit date)\b/i.test(q);

  const asksStage =
    /\b(administrative stage|current stage|recorded stage|clinic record status)\b/i.test(q);

  // Document questions
  if (asksDocuments) {
    const docs = await Document.find({ patientId })
      .select("name status")
      .lean();

    if (!docs.length) {
      return {
        answered: false,
        answer:
          "I couldn't verify document information in the clinic records. I'll refer this to staff.",
      };
    }

    const relevantDocs = asksPending
      ? docs.filter((doc) => doc.status === "Pending")
      : docs;

    return {
      answered: true,
      source: "Clinic document records",
      answer: relevantDocs.length
        ? relevantDocs
            .map((doc) => `${doc.name}: ${doc.status}`)
            .join(". ") + "."
        : "No pending documents are recorded for this patient.",
    };
  }

  // Appointment questions
  if (asksAppointment) {
    const appointment = await Appointment.findOne({
      patientId,
      status: "Scheduled",
    })
      .sort({ date: 1 })
      .select("date time status")
      .lean();

    if (!appointment) {
      return {
        answered: false,
        answer:
          "I couldn't verify a scheduled appointment. I'll refer this to clinic staff.",
      };
    }

    return {
      answered: true,
      source: "Clinic appointment records",
      answer: `The recorded appointment is on ${appointment.date} at ${appointment.time}.`,
    };
  }

  // Administrative stage only; not a medical or treatment assessment.
  if (asksStage) {
    return {
      answered: true,
      source: "Patient administrative record",
      answer: `The recorded administrative stage is ${patient.treatmentStage}. This is an administrative record, not a medical assessment.`,
    };
  }

  return {
    answered: false,
    answer:
      "I couldn't verify an answer from the available clinic records. I'll refer your question to clinic staff.",
  };
}

module.exports = answerQuestion;
