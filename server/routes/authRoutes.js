const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Patient = require("../models/Patient");
const PatientInvitation = require("../models/PatientInvitation");
const { auth } = require("../middleware/auth");
const { createNotification } = require("../services/notificationService");

const router = express.Router();

// Helper: Hash raw invitation token for secure lookup
function hashToken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") return "";
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

// In-memory rate limiter for auth endpoints
const rateLimitMap = new Map();
function rateLimit(maxRequests = 30, windowMs = 60 * 1000) {
  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || "global";
    const now = Date.now();
    const clientData = rateLimitMap.get(ip) || { count: 0, startTime: now };

    if (now - clientData.startTime > windowMs) {
      clientData.count = 1;
      clientData.startTime = now;
    } else {
      clientData.count += 1;
    }

    rateLimitMap.set(ip, clientData);

    if (clientData.count > maxRequests) {
      return res.status(429).json({
        message: "Too many attempts. Please wait a minute and try again.",
      });
    }

    next();
  };
}

// 1. Verify invitation by token (Public - GET /api/auth/invitation/:token)
router.get("/invitation/:token", rateLimit(30), async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || !token.trim()) {
      return res.status(400).json({ message: "Invitation token is required." });
    }

    const tokenHash = hashToken(token);
    const invitation = await PatientInvitation.findOne({ tokenHash });

    if (!invitation) {
      return res.status(404).json({
        message: "Invalid or expired invitation link. Please request a new invitation from clinic staff.",
      });
    }

    if (invitation.status === "accepted") {
      return res.status(400).json({
        message: "This invitation has already been used to activate an account. Please sign in with your email.",
        alreadyUsed: true,
      });
    }

    if (invitation.status === "revoked") {
      return res.status(400).json({
        message: "This invitation was revoked by clinic staff. Please contact the clinic for a new link.",
      });
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      invitation.status = "expired";
      await invitation.save();
      return res.status(400).json({
        message: "This invitation link has expired (validity is 48 hours). Please request a new invite from staff.",
        expired: true,
      });
    }

    // Verify patient record exists
    const patient = await Patient.findOne({ patientId: invitation.patientId }).lean();
    if (!patient) {
      return res.status(404).json({
        message: "Associated patient record was not found.",
      });
    }

    return res.json({
      valid: true,
      patientId: invitation.patientId,
      name: patient.name || invitation.name,
      email: invitation.email,
      treatmentStage: patient.treatmentStage,
    });
  } catch (error) {
    console.error("Invitation check failed:", error.message);
    return res.status(500).json({ message: "Could not verify invitation." });
  }
});

// Helper POST verify endpoint for manual code entry
router.post("/verify-invitation", rateLimit(30), async (req, res) => {
  try {
    const { token, code } = req.body || {};
    const rawToken = token || code;

    if (!rawToken || typeof rawToken !== "string" || !rawToken.trim()) {
      return res.status(400).json({
        message: "Invitation code or token is required.",
      });
    }

    const tokenHash = hashToken(rawToken);
    const invitation = await PatientInvitation.findOne({ tokenHash });

    if (!invitation) {
      return res.status(404).json({
        message: "Invalid invitation code or link.",
      });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({
        message: `This invitation has already been ${invitation.status}.`,
      });
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      invitation.status = "expired";
      await invitation.save();
      return res.status(400).json({
        message: "This invitation code has expired.",
      });
    }

    const patient = await Patient.findOne({ patientId: invitation.patientId }).lean();

    return res.json({
      valid: true,
      patientId: invitation.patientId,
      name: patient?.name || invitation.name,
      email: invitation.email,
      treatmentStage: patient?.treatmentStage,
    });
  } catch (error) {
    console.error("Verification failed:", error.message);
    return res.status(500).json({ message: "Could not verify invitation." });
  }
});

// 2. Patient Account Activation / Signup (Public)
async function handleSignup(req, res) {
  try {
    const {
      token,
      password,
      languagePreference = "en",
    } = req.body || {};

    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(400).json({
        message: "A valid invitation token is required.",
      });
    }

    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long.",
      });
    }

    const tokenHash = hashToken(token);

    // Atomically find and consume the invitation
    const invitation = await PatientInvitation.findOneAndUpdate(
      {
        tokenHash,
        status: "pending",
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          status: "accepted",
          usedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!invitation) {
      return res.status(400).json({
        message: "Invalid, expired, or already consumed invitation link.",
      });
    }

    const normalizedEmail = invitation.email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { patientId: invitation.patientId }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account is already active with this email address or Patient ID.",
      });
    }

    // Load Patient record
    const patient = await Patient.findOne({ patientId: invitation.patientId });
    const patientName = patient?.name || invitation.name || "Patient";

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User - Strictly enforce role 'patient' (public signup cannot create staff!)
    const newUser = await User.create({
      name: patientName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "patient",
      patientId: invitation.patientId,
      languagePreference: ["en", "ta", "hi"].includes(languagePreference)
        ? languagePreference
        : "en",
    });

    // Mark patient record as activated
    if (patient) {
      patient.isActivated = true;
      await patient.save();
    }

    // Notify staff
    await createNotification({
      recipientRole: "staff",
      type: "registration",
      title: "Patient Account Activated",
      message: `${patientName} (${invitation.patientId}) activated their portal account.`,
      link: `/staff/patients/${invitation.patientId}`,
    });

    // Notify patient
    await createNotification({
      recipientRole: "patient",
      patientId: invitation.patientId,
      recipientUser: newUser._id,
      type: "general",
      title: "Welcome to CareLume AI",
      message: "Your account is active! You can view your clinic appointments, upload documents, and ask routine care questions.",
      link: "/patient",
    });

    // Issue JWT
    const jwtToken = jwt.sign(
      { id: newUser._id },
      process.env.JWT_SECRET || "carelume_secure_jwt_secret",
      { expiresIn: "8h" }
    );

    return res.status(201).json({
      message: "Account activated successfully.",
      token: jwtToken,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        patientId: newUser.patientId,
        languagePreference: newUser.languagePreference,
      },
    });
  } catch (error) {
    console.error("Signup failed:", error.message);
    return res.status(500).json({
      message: "Account activation failed. Please try again.",
    });
  }
}

router.post("/signup", rateLimit(15), handleSignup);
router.post("/activate", rateLimit(15), handleSignup);

// 3. Login (Supports Email or Patient ID + Password)
router.post("/login", rateLimit(25), async (req, res) => {
  try {
    const { email, patientId, identifier, password } = req.body || {};

    const rawLoginKey = identifier || patientId || email;

    if (
      !rawLoginKey ||
      typeof rawLoginKey !== "string" ||
      !rawLoginKey.trim() ||
      !password ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Patient ID/Email and password are required.",
      });
    }

    const trimmedKey = rawLoginKey.trim();
    const isEmail = trimmedKey.includes("@");
    const normalizedEmail = trimmedKey.toLowerCase();
    const normalizedPatientId = trimmedKey.toUpperCase();

    // Query User by email or patientId
    let query;
    if (isEmail) {
      query = { email: normalizedEmail };
    } else {
      query = {
        $or: [
          { patientId: normalizedPatientId },
          { email: normalizedEmail },
        ],
      };
    }

    const user = await User.findOne(query).select("+password");

    if (!user) {
      // Check if patient exists in Patient collection but not yet activated
      const unactivatedPatient = await Patient.findOne({
        $or: [
          { patientId: normalizedPatientId },
          { email: normalizedEmail },
        ],
      });

      if (unactivatedPatient && !unactivatedPatient.isActivated) {
        return res.status(401).json({
          message:
            "This patient account has not been activated yet. Please activate your account using your clinic invitation before signing in.",
          needsActivation: true,
          patientId: unactivatedPatient.patientId,
        });
      }

      return res.status(401).json({
        message: "Invalid Patient ID / Email or password.",
      });
    }

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid Patient ID / Email or password.",
      });
    }

    // If patient role, ensure patient record is active
    if (user.role === "patient" && user.patientId) {
      const patient = await Patient.findOne({ patientId: user.patientId });
      if (patient && !patient.isActivated) {
        return res.status(401).json({
          message:
            "This patient account has not been activated yet. Please activate your account using your clinic invitation.",
          needsActivation: true,
          patientId: user.patientId,
        });
      }
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "carelume_secure_jwt_secret",
      { expiresIn: "8h" }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        patientId: user.patientId,
        languagePreference: user.languagePreference || "en",
      },
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    return res.status(500).json({
      message: "Login failed. Please try again.",
    });
  }
});

// 4. Current authenticated user
router.get("/me", auth, (req, res) => {
  const { _id, name, email, role, patientId, languagePreference } = req.user;

  return res.json({
    id: _id,
    name,
    email,
    role,
    patientId,
    languagePreference: languagePreference || "en",
  });
});

// 5. Update user preferences (e.g. language)
router.patch("/preference", auth, async (req, res) => {
  try {
    const { languagePreference } = req.body || {};

    if (
      languagePreference &&
      ["en", "ta", "hi"].includes(languagePreference)
    ) {
      await User.findByIdAndUpdate(req.user._id, {
        $set: { languagePreference },
      });
      return res.json({ success: true, languagePreference });
    }

    return res.status(400).json({ message: "Invalid language preference." });
  } catch (error) {
    console.error("Update preference failed:", error.message);
    return res.status(500).json({ message: "Could not update preferences." });
  }
});

module.exports = router;
