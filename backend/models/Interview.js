const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: [true, "Interview date/time is required"],
    },
    mode: {
      type: String,
      enum: ["online", "offline"],
      required: true,
    },
    meetLink: { type: String }, // for online
    venue: { type: String },   // for offline
    round: {
      type: String,
      enum: ["aptitude", "technical", "hr", "final"],
      default: "technical",
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "rescheduled"],
      default: "scheduled",
    },
    feedback: { type: String }, // company's post-interview notes
    duration: { type: Number, default: 60 }, // minutes
  },
  { timestamps: true }
);

interviewSchema.index({ student: 1, status: 1 });
interviewSchema.index({ company: 1, status: 1 });

module.exports = mongoose.model("Interview", interviewSchema);
