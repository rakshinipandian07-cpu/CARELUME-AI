const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/carelume";

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB connected successfully to:", uri.includes("@") ? "MongoDB Atlas" : uri);
  } catch (err) {
    if (uri.includes("mongodb+srv") || uri.includes("@")) {
      console.warn("\n[MongoDB Atlas Connection Failed] Trying local MongoDB instance (mongodb://127.0.0.1:27017/carelume)...");
      try {
        await mongoose.connect("mongodb://127.0.0.1:27017/carelume", {
          serverSelectionTimeoutMS: 3000,
        });
        console.log("Connected to local MongoDB (mongodb://127.0.0.1:27017/carelume)");
        return;
      } catch (localErr) {
        // Continue to throw main error
      }
    }

    console.error("\n[MongoDB Connection Error]");
    console.error(err.message);
    console.error(
      "Tip: If using MongoDB Atlas, in Atlas -> Network Access, ensure 0.0.0.0/0 (Allow Access from Anywhere) is added or your current IP is whitelisted."
    );
    throw err;
  }
}

module.exports = connectDB;
