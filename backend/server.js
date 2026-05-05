require("dotenv").config();
require("express-async-errors");

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");

// Route imports
const authRoutes = require("./routes/auth");
const jobRoutes = require("./routes/jobs");
const applicationRoutes = require("./routes/applications");
const interviewRoutes = require("./routes/interviews");
const aiRoutes = require("./routes/ai");
const adminRoutes = require("./routes/admin");
const oauthRoutes = require("./routes/oauth");

const app = express();
const server = http.createServer(app);

// Initialize Passport (Google OAuth) — must be after app is created
const passport = require("./config/passport");
app.use(passport.initialize());

// ─── Socket.io Setup ──────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  // Each user joins their own room using their userId
  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`Socket: User ${userId} joined room`);
  });

  socket.on("disconnect", () => {
    console.log("Socket: Client disconnected");
  });
});

// Make io accessible in routes via req.io
app.set("io", io);

// ─── Database ────────────────────────────────────────────────────────────────
connectDB();

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));

// Serve locally uploaded files (used when Cloudinary is not configured)
const path = require("path");
const fs = require("fs");
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== 'production';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  skip: () => isDev, // no rate limiting in development
  message: { error: 'Too many attempts, please try again after 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  skip: () => isDev, // no rate limiting in development
  message: { error: 'Too many requests, please slow down.' },
});

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "campus-placement-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/auth", oauthRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready`);
  console.log(`🌐 Env: ${process.env.NODE_ENV || "development"}\n`);
});

module.exports = { app, server }; // for testing
