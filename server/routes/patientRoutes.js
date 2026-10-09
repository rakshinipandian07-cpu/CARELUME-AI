const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const User = require("../models/User");
const PatientInvitation = require("../models/PatientInvitation");
const Document = require("../models/Document");
const { auth, allowRoles } = require("../middleware/auth");
const { createNotification } = require("../services/notificationService");
const { sendEmail } = require("../services/emailService");

const router = express.Router();

/**
 * Helper: SHA-256 Hash raw invitation token for database storage and lookup
 */
function hashToken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") return "";
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

/**
 * Helper: Generate next unique Patient ID safely against concurrent registrations (e.g. PAT1005)
 */
async function generateNextPatientId() {
  const patients = await Patient.find({}, { patientId: 1 }).lean();
  let maxNum = 1000;

  for (const p of patients) {
    if (p.patientId) {
      const match = /^PAT(\d+)$/i.exec(p.patientId);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  }

  return `PAT${maxNum + 1}`;
}

// 1. Get all patients with account status (Staff only)
router.get("/", auth, allowRoles("staff"), async (req, res) => {
  try {
    const [patients, users, invitations] = await Promise.all([
      Patient.find().sort({ createdAt: -1 }).lean(),
      User.find({ role: "patient" }, { patientId: 1, email: 1 }).lean(),
      PatientInvitation.find().sort({ createdAt: -1 }).lean(),
    ]);

    const activePatientIds = new Set(users.map((u) => u.patientId));
    const activeEmails = new Set(users.map((u) => u.email.toLowerCase()));
    const now = new Date();

    const enriched = patients.map((p) => {
      const isAccountActive =
        p.isActivated ||
        activePatientIds.has(p.patientId) ||
        (p.email && activeEmails.has(p.email.toLowerCase()));

      let accountStatus = isAccountActive ? "Active" : "No Invitation";

      if (!isAccountActive) {
        const patientInvs = invitations.filter((i) => i.patientId === p.patientId || (p.email && i.email === p.email.toLowerCase()));
        if (patientInvs.length > 0) {
          const latestInv = patientInvs[0];
          if (latestInv.status === "pending") {
            accountStatus = new Date(latestInv.expiresAt) < now ? "Invitation Expired" : "Invitation Pending";
          } else if (latestInv.status === "revoked") {
            accountStatus = "Invitation Revoked";
          } else if (latestInv.status === "expired") {
            accountStatus = "Invitation Expired";
          }
        }
      }

      return {
        ...p,
        accountStatus,
      };
    });

    return res.json(enriched);
  } catch (error) {
    console.error("Patients fetch failed:", error.message);
    return res.status(500).json({ message: "Could not load patients" });
  }
});

// 2. Get list of all invitations (Staff only)
router.get("/invitations/list", auth, allowRoles("staff"), async (req, res) => {
  try {
    const invitations = await PatientInvitation.find()
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();
    const formatted = invitations.map((inv) => {
      let currentStatus = inv.status;
      if (currentStatus === "pending" && new Date(inv.expiresAt) < now) {
        currentStatus = "expired";
      }
      return {
        _id: inv._id,
        patientId: inv.patientId,
        name: inv.name,
        email: inv.email,
        displayCode: inv.displayCode || "CL-INVITE",
        status: currentStatus,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      };
    });

    return res.json(formatted);
  } catch (error) {
    console.error("Invitations fetch failed:", error.message);
    return res.status(500).json({ message: "Could not load invitations" });
  }
});

// 3. Register a new patient and generate secure single-use invitation (Staff only)
async function handleRegisterPatient(req, res) {
  try {
    const { name, email, treatmentStage, phone, customPatientId } = req.body || {};

    if (
      !name ||
      typeof name !== "string" ||
      !name.trim() ||
      !email ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        message: "Patient name and registered email are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please provide a valid email address.",
      });
    }

    // Check if user account already exists with this email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        message: "An active user account is already registered with this email address.",
      });
    }

    // Check if a patient record already exists with this email
    const existingPatientByEmail = await Patient.findOne({ email: normalizedEmail });
    if (existingPatientByEmail) {
      return res.status(409).json({
        message: `A patient record is already registered with this email address (Patient ID: ${existingPatientByEmail.patientId}).`,
      });
    }

    // Assign unique Patient ID
    let finalPatientId = customPatientId ? customPatientId.trim().toUpperCase() : null;
    if (finalPatientId) {
      const existsId = await Patient.findOne({ patientId: finalPatientId });
      if (existsId) {
        return res.status(409).json({
          message: `Patient ID ${finalPatientId} is already in use. Please use an auto-generated ID.`,
        });
      }
    } else {
      finalPatientId = await generateNextPatientId();
    }

    // Create Patient record
    const patient = await Patient.create({
      patientId: finalPatientId,
      name: name.trim(),
      email: normalizedEmail,
      treatmentStage: treatmentStage || "Consultation",
      phone: phone ? phone.trim() : "",
      isActivated: false,
      registeredBy: req.user?._id || null,
    });

    // Invalidate any existing pending invitations for this email or patient
    await PatientInvitation.updateMany(
      {
        $or: [{ patientId: finalPatientId }, { email: normalizedEmail }],
        status: "pending",
      },
      { $set: { status: "revoked" } }
    );

    // Generate secure single-use random token & store SHA-256 hash
    const rawToken = crypto.randomBytes(24).toString("hex");
    const tokenHash = hashToken(rawToken);
    const displayCode = "CL-" + rawToken.slice(0, 6).toUpperCase();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const invitation = await PatientInvitation.create({
      patientId: finalPatientId,
      name: name.trim(),
      email: normalizedEmail,
      tokenHash,
      displayCode,
      status: "pending",
      expiresAt,
      createdBy: req.user?._id || null,
    });

    // Create default starter checklist documents if none exist
    const existingDocs = await Document.countDocuments({ patientId: finalPatientId });
    if (existingDocs === 0) {
      await Document.create([
        {
          patientId: finalPatientId,
          name: "Government ID / Passport",
          category: "Identification",
          status: "Pending",
        },
        {
          patientId: finalPatientId,
          name: "Initial Medical History Form",
          category: "Medical Records",
          status: "Pending",
        },
        {
          patientId: finalPatientId,
          name: "Fertility Treatment Consent Form",
          category: "Consent Forms",
          status: "Pending",
        },
      ]);
    }

    // In-app notification for clinic staff
    await createNotification({
      recipientRole: "staff",
      type: "registration",
      title: "Patient Registered",
      message: `Patient ${name.trim()} (${finalPatientId}) registered. Invitation link generated.`,
      link: `/staff/patients/${finalPatientId}`,
    });

    // Send invitation email if configured
    await sendEmail({
      to: normalizedEmail,
      subject: "CareLume AI — Invitation to Activate Your Patient Portal Account",
      text: `Hello ${name.trim()},\n\nYour clinic record has been prepared with Patient ID: ${finalPatientId}.\n\nPlease activate your account using your secure invitation link (valid for 48 hours):\n\nPatient ID: ${finalPatientId}\nInvitation Token: ${rawToken}\n\nBest regards,\nCareLume AI Team`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.5; color: #1e293b;">
          <h2>Welcome to CareLume AI</h2>
          <p>Hello <strong>${name.trim()}</strong>,</p>
          <p>Your clinic record has been created with Patient ID <strong>${finalPatientId}</strong>.</p>
          <p>Please use your secure invitation to activate your account and choose a password.</p>
          <div style="background: #f0fdfa; border: 1px solid #ccfbf1; padding: 12px 16px; border-radius: 8px; font-size: 1.1rem; font-weight: bold; color: #0f766e; display: inline-block;">
            Patient ID: ${finalPatientId}
          </div>
          <p style="color: #64748b; font-size: 0.875rem; margin-top: 14px;">This invitation is valid for 48 hours.</p>
        </div>
      `,
    });

    return res.status(201).json({
      message: "Patient registered and invitation generated.",
      patient: {
        _id: patient._id,
        patientId: patient.patientId,
        name: patient.name,
        email: patient.email,
        treatmentStage: patient.treatmentStage,
        isActivated: false,
        createdAt: patient.createdAt,
      },
      invitation: {
        id: invitation._id,
        patientId: invitation.patientId,
        email: invitation.email,
        token: rawToken,
        displayCode,
        expiresAt: invitation.expiresAt,
        status: invitation.status,
      },
    });
  } catch (error) {
    console.error("Patient registration failed:", error.message);
    return res.status(500).json({
      message: error.message || "Failed to register patient record.",
    });
  }
}

// Register endpoints
router.post("/", auth, allowRoles("staff"), handleRegisterPatient);
router.post("/register", auth, allowRoles("staff"), handleRegisterPatient);
router.post("/register-invitation", auth, allowRoles("staff"), handleRegisterPatient);

// 4. Reissue an invitation for existing patient (Staff only)
router.post(
  "/:patientId/reissue-invitation",
  auth,
  allowRoles("staff"),
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const { email } = req.body || {};

      const patient = await Patient.findOne({ patientId: patientId.toUpperCase() });
      if (!patient) {
        return res.status(404).json({ message: "Patient not found." });
      }

      const targetEmail = email ? email.trim().toLowerCase() : patient.email;
      if (!targetEmail) {
        return res.status(400).json({ message: "Please provide the patient's registered email address." });
      }

      // Invalidate existing pending invitations
      await PatientInvitation.updateMany(
        { patientId: patient.patientId, status: "pending" },
        { $set: { status: "revoked" } }
      );

      const rawToken = crypto.randomBytes(24).toString("hex");
      const tokenHash = hashToken(rawToken);
      const displayCode = "CL-" + rawToken.slice(0, 6).toUpperCase();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const invitation = await PatientInvitation.create({
        patientId: patient.patientId,
        name: patient.name,
        email: targetEmail,
        tokenHash,
        displayCode,
        status: "pending",
        expiresAt,
        createdBy: req.user._id,
      });

      return res.json({
        message: "New invitation generated successfully.",
        invitation: {
          id: invitation._id,
          patientId: invitation.patientId,
          email: invitation.email,
          token: rawToken,
          displayCode,
          expiresAt: invitation.expiresAt,
          status: invitation.status,
        },
      });
    } catch (error) {
      console.error("Reissue invitation failed:", error.message);
      return res.status(500).json({ message: "Could not reissue invitation." });
    }
  }
);

// 5. Revoke an invitation (Staff only)
router.post(
  "/invitations/:id/revoke",
  auth,
  allowRoles("staff"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid invitation ID." });
      }

      const invitation = await PatientInvitation.findByIdAndUpdate(
        req.params.id,
        { $set: { status: "revoked" } },
        { new: true }
      );

      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found." });
      }

      return res.json({ message: "Invitation revoked successfully.", invitation });
    } catch (error) {
      console.error("Revoke invitation failed:", error.message);
      return res.status(500).json({ message: "Could not revoke invitation." });
    }
  }
);

// 6. Get a specific patient by ID (Staff or authorized Patient)
router.get("/:patientId", auth, async (req, res) => {
  try {
    if (
      req.user.role === "patient" &&
      req.user.patientId !== req.params.patientId
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const patient = await Patient.findOne({
      patientId: req.params.patientId.toUpperCase(),
    }).lean();

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    return res.json(patient);
  } catch (error) {
    console.error("Patient load failed:", error.message);
    return res.status(500).json({ message: "Could not load patient" });
  }
});

module.exports = router;
