require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
  res.json({
    message: "CareLume AI API is running",
    status: "healthy",
    version: "1.0.0",
  });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/patients", require("./routes/patientRoutes"));
app.use("/api/appointments", require("./routes/appointmentRoutes"));
app.use("/api/documents", require("./routes/documentRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/tickets", require("./routes/ticketRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error("API Error:", err.message);
  return res.status(err.status || 500).json({
    message: err.message || "An unexpected error occurred.",
  });
});

const PORT = process.env.PORT || 5000;

const { migratePatientRecords } = require("./services/migrationService");

async function startServer() {
  if (!process.env.JWT_SECRET) {
    console.warn("[Config Warning] JWT_SECRET is not set in server/.env — using fallback for development.");
  }

  try {
    await connectDB();
    await migratePatientRecords();

    app.listen(PORT, () => {
      console.log(`CareLume API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup aborted due to DB connection error.");
  }
}

startServer();
