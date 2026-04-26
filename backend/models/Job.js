const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Job description is required"],
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requiredSkills: {
      type: [String],
      required: [true, "At least one skill is required"],
    },
    minCGPA: {
      type: Number,
      required: [true, "Minimum CGPA is required"],
      min: 0,
      max: 10,
    },
    allowedBranches: {
      type: [String],
      enum: ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "CHEM", "OTHER", "ALL"],
      default: ["ALL"],
    },
    ctc: {
      type: String, // e.g. "8-12 LPA" or "10 LPA"
      required: [true, "CTC is required"],
    },
    location: { type: String, required: true },
    jobType: {
      type: String,
      enum: ["full-time", "internship", "contract"],
      default: "full-time",
    },
    deadline: {
      type: Date,
      required: [true, "Application deadline is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    applicantCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for fast queries
jobSchema.index({ company: 1, isActive: 1 });
jobSchema.index({ deadline: 1 });
jobSchema.index({ minCGPA: 1 });

module.exports = mongoose.model("Job", jobSchema);
