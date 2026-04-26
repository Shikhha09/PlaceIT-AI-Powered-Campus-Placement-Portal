const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    status: {
      type: String,
      enum: ["applied", "under_review", "shortlisted", "interviewed", "offered", "rejected"],
      default: "applied",
    },
    aiScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    aiBreakdown: {
      skillMatch: Number,
      cgpaScore: Number,
      mlConfidence: Number,
    },
    coverNote: {
      type: String,
      maxlength: 500,
    },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true }
);

// One application per student per job
applicationSchema.index({ student: 1, job: 1 }, { unique: true });
applicationSchema.index({ job: 1, status: 1 });
applicationSchema.index({ student: 1, status: 1 });

module.exports = mongoose.model("Application", applicationSchema);
