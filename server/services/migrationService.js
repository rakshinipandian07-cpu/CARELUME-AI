const mongoose = require("mongoose");
const Patient = require("../models/Patient");
const User = require("../models/User");

/**
 * Safe Migration: Ensure all existing patients in MongoDB have a valid email and correct activation status
 * without modifying or deleting any medical records.
 */
async function migratePatientRecords() {
  try {
    const patients = await Patient.find();
    for (const patient of patients) {
      let needsSave = false;

      // 1. If email is missing, lookup existing user or set a sensible clean fallback
      if (!patient.email) {
        const user = await User.findOne({ patientId: patient.patientId });
        if (user && user.email) {
          patient.email = user.email.toLowerCase().trim();
          patient.isActivated = true;
          needsSave = true;
        } else {
          // Fallback based on name for legacy seed
          const cleanName = patient.name.toLowerCase().replace(/[^a-z0-9]/g, "");
          patient.email = `${cleanName || "patient"}@example.com`;
          needsSave = true;
        }
      }

      // 2. Check if a User already exists with this patientId
      if (!patient.isActivated) {
        const existingUser = await User.findOne({ patientId: patient.patientId });
        if (existingUser) {
          patient.isActivated = true;
          needsSave = true;
        }
      }

      if (needsSave) {
        await patient.save();
      }
    }

    // Drop legacy obsolete indexes if they exist
    try {
      const collection = mongoose.connection.collection("patientinvitations");
      const indexes = await collection.indexes();
      const hasTokenIndex = indexes.some((idx) => idx.name === "token_1");
      if (hasTokenIndex) {
        await collection.dropIndex("token_1");
        console.log("Legacy index token_1 dropped from patientinvitations.");
      }
    } catch {
      // Ignore if collection doesn't exist yet
    }
  } catch (err) {
    console.warn("Patient migration check notice:", err.message);
  }
}

module.exports = {
  migratePatientRecords,
};
