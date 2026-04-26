const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
 
// ── Determine storage strategy ────────────────────────────────────────────────
// Priority: Supabase → Local disk fallback
const useSupabase =
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_KEY &&
  process.env.SUPABASE_URL !== "your_supabase_url";
 
let supabase;
 
if (useSupabase) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  console.log("☁️  File storage: Supabase Storage");
} else {
  // Local disk fallback for dev without Supabase
  const uploadDir = path.join(__dirname, "..", "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📁 File storage: Local disk (./uploads)");
}
 
// ── Multer — memory storage always ───────────────────────────────────────────
const storage = multer.memoryStorage();
 
const fileFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOCX, and TXT files are allowed."), false);
  }
};
 
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
 
// ── Upload function ───────────────────────────────────────────────────────────
const uploadToCloudinary = async (buffer, folder = "resumes", originalName = "resume.pdf") => {
  // Sanitize filename, preserve extension
  const ext = path.extname(originalName).toLowerCase() || ".pdf";
  const baseName = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 60);
  const filename = `${Date.now()}_${baseName}${ext}`;
 
  if (useSupabase) {
    const bucket = process.env.SUPABASE_BUCKET || "resumes";
    const filePath = `${folder}/${filename}`;
 
    // Determine MIME type
    const mimeMap = {
      ".pdf":  "application/pdf",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".txt":  "text/plain",
    };
    const contentType = mimeMap[ext] || "application/octet-stream";
 
    // Upload to Supabase Storage — stores file exactly as-is
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType,
        upsert: true, // overwrite if same name
      });
 
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
 
    // Get public URL — this URL opens the file directly in browser
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
 
    return {
      secure_url: urlData.publicUrl,
      public_id: filePath, // used for deletion later
    };
  } else {
    // Local disk fallback
    const filepath = path.join(__dirname, "..", "uploads", filename);
    fs.writeFileSync(filepath, buffer);
    const baseUrl = process.env.BASE_URL || "http://localhost:5000";
    return {
      secure_url: `${baseUrl}/uploads/${filename}`,
      public_id: `local_${filename}`,
    };
  }
};
 
// ── Delete function ───────────────────────────────────────────────────────────
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
 
  if (publicId.startsWith("local_")) {
    // Delete local file
    const filename = publicId.replace("local_", "");
    const filepath = path.join(__dirname, "..", "uploads", filename);
    try {
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    } catch (err) {
      console.error("Local file delete error:", err.message);
    }
  } else if (useSupabase) {
    // Delete from Supabase
    const bucket = process.env.SUPABASE_BUCKET || "resumes";
    const { error } = await supabase.storage.from(bucket).remove([publicId]);
    if (error) console.error("Supabase delete error:", error.message);
  }
};
 
// Also serve local uploads when not using Supabase
module.exports = { upload, uploadToCloudinary, deleteFromCloudinary, useSupabase };
 