const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["staff", "patient"],
      required: true,
    },
    patientId: { type: String, default: null, index: true },
    languagePreference: {
      type: String,
      enum: ["en", "ta", "hi"],
      default: "en",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
