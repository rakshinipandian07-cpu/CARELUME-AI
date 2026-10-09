require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User");
const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const Document = require("../models/Document");
const SupportTicket = require("../models/SupportTicket");
const PatientInvitation = require("../models/PatientInvitation");
const Notification = require("../models/Notification");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    await Promise.all([
      User.deleteMany({}),
      Patient.deleteMany({}),
      Appointment.deleteMany({}),
      Document.deleteMany({}),
      SupportTicket.deleteMany({}),
      PatientInvitation.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    const password = await bcrypt.hash("Demo@12345", 10);

    const users = await User.create([
      {
        name: "Dr. Sarah Mitchell",
        email: "staff@carelume.demo",
        password,
        role: "staff",
      },
      {
        name: "Dr. Sarah Mitchell",
        email: "doctor@carelume.ai",
        password,
        role: "staff",
      },
      {
        name: "Aarohi Sharma",
        email: "patient@carelume.demo",
        password,
        role: "patient",
        patientId: "PAT1001",
      },
      {
        name: "Emma Watson",
        email: "emma@example.com",
        password,
        role: "patient",
        patientId: "PAT1001",
      },
      {
        name: "Kavya Patel",
        email: "patient2@carelume.demo",
        password,
        role: "patient",
        patientId: "PAT1002",
      },
      {
        name: "Priya Sundaram",
        email: "priya@example.com",
        password,
        role: "patient",
        patientId: "PAT1003",
      },
    ]);

    await Patient.create([
      {
        patientId: "PAT1001",
        name: "Aarohi Sharma",
        email: "emma@example.com",
        treatmentStage: "Stimulation",
        isActivated: true,
      },
      {
        patientId: "PAT1002",
        name: "Kavya Patel",
        email: "patient2@carelume.demo",
        treatmentStage: "Testing",
        isActivated: true,
      },
      {
        patientId: "PAT1003",
        name: "Priya Sundaram",
        email: "priya@example.com",
        treatmentStage: "Consultation",
        isActivated: true,
      },
      {
        patientId: "PAT1004",
        name: "Ananya Iyer",
        email: "ananya@example.com",
        treatmentStage: "Consultation",
        isActivated: false,
      },
    ]);

    await Appointment.create([
      {
        patientId: "PAT1001",
        date: "2026-10-12",
        time: "10:30 AM",
        status: "Scheduled",
      },
      {
        patientId: "PAT1001",
        date: "2026-10-19",
        time: "11:00 AM",
        status: "Scheduled",
      },
      {
        patientId: "PAT1002",
        date: "2026-10-14",
        time: "02:00 PM",
        status: "Scheduled",
      },
      {
        patientId: "PAT1003",
        date: "2026-10-16",
        time: "09:30 AM",
        status: "Scheduled",
      },
    ]);

    await Document.create([
      {
        patientId: "PAT1001",
        name: "Government ID / Passport",
        category: "Identification",
        status: "Approved",
        fileUrl: "https://res.cloudinary.com/demo/image/upload/v1611311111/sample.jpg",
        resourceType: "image",
        mimeType: "image/jpeg",
        fileSize: 245000,
        submittedAt: new Date(Date.now() - 3 * 86400000),
        reviewedBy: "Dr. Sarah Mitchell",
        reviewedAt: new Date(Date.now() - 2 * 86400000),
        reviewNotes: "Identity verified successfully.",
      },
      {
        patientId: "PAT1001",
        name: "Fertility Treatment Consent Form",
        category: "Consent Forms",
        status: "Submitted",
        fileUrl: "https://res.cloudinary.com/demo/image/upload/v1611311111/sample.jpg",
        resourceType: "image",
        mimeType: "image/jpeg",
        fileSize: 412000,
        submittedAt: new Date(Date.now() - 1 * 86400000),
      },
      {
        patientId: "PAT1001",
        name: "Initial Hormone Panel Lab Report",
        category: "Lab Reports",
        status: "Pending",
      },
      {
        patientId: "PAT1002",
        name: "Registration & Medical History Form",
        category: "Medical Records",
        status: "Pending",
      },
      {
        patientId: "PAT1003",
        name: "Pre-screening Assessment",
        category: "Medical Records",
        status: "Pending",
      },
    ]);

    await SupportTicket.create([
      {
        patientId: "PAT1001",
        question: "Can I take folic acid supplement with my current prescription?",
        assignedTo: "Dr. Sarah Mitchell",
        status: "In Progress",
      },
      {
        patientId: "PAT1002",
        question: "How long before the consultation should I arrive for paperwork?",
        assignedTo: "Clinic Staff",
        status: "Resolved",
      },
    ]);

    await Notification.create([
      {
        recipientRole: "patient",
        patientId: "PAT1001",
        type: "appointment",
        title: "Upcoming Appointment Reminder",
        message: "Your stimulation monitoring ultrasound is scheduled for Oct 12 at 10:30 AM.",
        link: "/patient/appointments",
        read: false,
      },
      {
        recipientRole: "patient",
        patientId: "PAT1001",
        type: "document",
        title: "Document Approved",
        message: 'Your document "Government ID / Passport" was reviewed and approved.',
        link: "/patient/documents",
        read: true,
        readAt: new Date(),
      },
      {
        recipientRole: "staff",
        type: "document",
        title: "New Document Submission",
        message: 'Patient Aarohi Sharma (PAT1001) submitted "Fertility Treatment Consent Form".',
        link: "/staff/documents",
        read: false,
      },
      {
        recipientRole: "staff",
        type: "ticket",
        title: "New Support Ticket",
        message: 'Patient Aarohi Sharma (PAT1001) submitted a query regarding supplements.',
        link: "/staff/tickets",
        read: false,
      },
    ]);

    console.log("Fictional demo data seeded successfully!");
    console.log("Demo credentials:");
    console.log("  Staff: staff@carelume.demo OR doctor@carelume.ai / Demo@12345");
    console.log("  Patient: patient@carelume.demo OR emma@example.com / Demo@12345");
    console.log("  Demo Invitation Token/Code: CL-DEMO99 (for PAT1004 / ananya@example.com)");
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
