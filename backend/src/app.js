require('dotenv').config();
const express = require("express");
const cors = require("cors");
const path = require("path");

// Import database connection
const connectDB = require("./config/database");

// Import routes
const authRoutes = require("./routes/auth");
const problemRoutes = require("./routes/problems");
const chatRoutes = require("./routes/chat");
const debugRoutes = require("./routes/debug");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../public")));
app.use("/uploads", express.static(path.join(__dirname, "../../public/uploads")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/debug", debugRoutes);
app.use("/api/admin", adminRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Serve frontend routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../public/login.html"));
});

app.get("/userDashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../../public/userDashboard.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../../public/login.html"));
});

app.get("/profile.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../../public/profile.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../../public/admin.html"));
});

app.get("/adminDashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../../public/adminDashboard.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

module.exports = app;
