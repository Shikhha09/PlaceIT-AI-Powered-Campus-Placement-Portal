const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorRole: {
      type: String,
      enum: ["student", "company", "admin"],
    },
    action: {
      type: String,
      required: true,
      // e.g. "USER_REGISTERED", "JOB_POSTED", "APPLICATION_SUBMITTED",
      //      "AI_SHORTLIST_TRIGGERED", "STATUS_UPDATED", "INTERVIEW_SCHEDULED"
    },
    entity: {
      type: String, // "Job", "Application", "User", "Interview"
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed, // extra context (e.g. old/new status)
    },
    ip: { type: String },
  },
  { timestamps: true }
);

activityLogSchema.index({ actor: 1, createdAt: -1 });
activityLogSchema.index({ action: 1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
