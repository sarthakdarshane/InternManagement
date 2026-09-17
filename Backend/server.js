require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDatabase = require("./config/database");

// Import routes
const authRoutes = require("./modules/auth/routes");
const companyRoutes = require("./modules/company/routes");
const userRoutes = require("./modules/company/userRoutes");
const internshipRoutes = require("./modules/internship/routes");
const mentorRoutes = require("./modules/mentor/routes");
const taskRoutes = require("./modules/task/routes");
const dailyUpdateRoutes = require("./modules/dailyUpdate/routes");
const evaluationRoutes = require("./modules/evaluation/routes");
const sentimentRoutes = require("./modules/sentiment/routes");
const reportRoutes = require("./modules/report/routes");

// Import middleware
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/api/health", (req, res) => {
  res.json({ message: "InternTracker API is running" });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/users", userRoutes);
app.use("/api/internships", internshipRoutes);
app.use("/api/mentor", mentorRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/daily-updates", dailyUpdateRoutes);
app.use("/api/evaluations", evaluationRoutes);
app.use("/api/sentiment", sentimentRoutes);
app.use("/api/reports", reportRoutes);

// Error handling middleware
app.use(errorHandler);

// Database connection and server start
connectDatabase()
  .then(() => {
    console.log("Connected to MongoDB Atlas");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  });

module.exports = app;
