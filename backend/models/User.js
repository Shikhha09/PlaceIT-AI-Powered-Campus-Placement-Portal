const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Never returned in queries by default
    },
    role: {
      type: String,
      enum: ["student", "company", "admin"],
      required: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Student-specific fields ───────────────────────────────────────────────
    branch: {
      type: String,
      enum: ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "CHEM", "OTHER"],
    },
    cgpa: {
      type: Number,
      min: [0, "CGPA cannot be negative"],
      max: [10, "CGPA cannot exceed 10"],
    },
    graduationYear: {
      type: Number,
      min: 2020,
      max: 2030,
    },
    skills: [{ type: String, trim: true }],
    experience: {
      type: Number,
      default: 0, // months of internship/work experience
    },
    resumeUrl: { type: String },
    resumeText: { type: String }, // parsed text stored for AI matching
    resumePublicId: { type: String }, // Cloudinary public_id for deletion
    linkedIn: { type: String },
    github: { type: String },
    bio: { type: String, maxlength: 500 },

    // ── Company-specific fields ───────────────────────────────────────────────
    companyName: { type: String },
    industry: { type: String },
    website: { type: String },
    description: { type: String, maxlength: 1000 },
    location: { type: String },
  },
  {
    timestamps: true,
  }
);

// ─── Hash password before save ────────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Compare password method ──────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Auto-approve admin ───────────────────────────────────────────────────────
userSchema.pre("save", function (next) {
  if (this.role === "admin") this.isApproved = true;
  next();
});

// ─── Remove password from JSON output ────────────────────────────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resumeText; // Don't send raw parsed text to frontend
  return obj;
};

module.exports = mongoose.model("User", userSchema);
