import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../api";
import Navbar from "../../components/Navbar";
import toast from "react-hot-toast";
import { Upload, ExternalLink } from "lucide-react";

const BRANCHES = ["CSE","IT","ECE","EEE","MECH","CIVIL","CHEM","OTHER"];

export default function StudentProfile() {
  const { user, login } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: user?.name, branch: user?.branch, cgpa: user?.cgpa,
      graduationYear: user?.graduationYear,
      skills: user?.skills?.join(", ") || "",
      experience: user?.experience || 0,
      linkedIn: user?.linkedIn || "",
      github: user?.github || "",
      bio: user?.bio || "",
    },
  });

  const onSave = async (data) => {
    setSaving(true);
    try {
      const skills = data.skills.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await authAPI.updateProfile({ ...data, skills, cgpa: parseFloat(data.cgpa) });
      // Update auth context with fresh data
      const token = localStorage.getItem("token");
      login(res.data.user, token);
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("resume", file);
    setUploading(true);
    try {
      await authAPI.uploadResume(formData);
      toast.success("Resume uploaded and parsed!");
      // Refresh user
      const meRes = await authAPI.me();
      const token = localStorage.getItem("token");
      login(meRes.data.user, token);
    } catch (err) {
      toast.error(err.response?.data?.error || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Profile</h1>

        {/* Resume Section */}
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Resume</h2>
          <div className="flex items-center gap-4 flex-wrap">
            {user?.resumeUrl ? (
              <a href={user.resumeUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary-600 text-sm hover:underline">
                <ExternalLink size={14} /> View Current Resume
              </a>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No resume uploaded yet.</p>
            )}
            <label className={`btn-primary text-sm cursor-pointer flex items-center gap-2 ${uploading ? "opacity-60" : ""}`}>
              <Upload size={14} />
              {uploading ? "Uploading..." : "Upload Resume"}
              <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleResumeUpload} disabled={uploading} />
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-2">Supported: PDF, DOCX, TXT • Max 5MB</p>

          {/* Resume parse warning — shown if resume uploaded but no text extracted */}
          {user?.resumeUrl && !user?.resumeText && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/40 rounded-lg">
              <span className="text-yellow-500 shrink-0">⚠️</span>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                We couldn't extract text from your resume. This reduces your AI shortlisting score.
                Make sure it's a <strong>text-based PDF</strong> (not a scanned image).
                Try uploading again with a different file.
              </p>
            </div>
          )}

          {/* Success indicator */}
          {user?.resumeUrl && user?.resumeText && (
            <div className="mt-3 flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 rounded-lg">
              <span className="text-green-500 shrink-0">✅</span>
              <p className="text-xs text-green-700 dark:text-green-300">
                Resume parsed successfully — your skills are ready for AI shortlisting.
              </p>
            </div>
          )}
        </div>

        {/* Profile form */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Personal Details</h2>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input {...register("name")} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <select {...register("branch")} className="input">
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CGPA</label>
                <input {...register("cgpa")} type="number" step="0.1" min="0" max="10" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
                <input {...register("graduationYear")} type="number" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience (months)</label>
                <input {...register("experience")} type="number" min="0" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                <input {...register("linkedIn")} type="url" className="input" placeholder="https://linkedin.com/in/..." />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skills <span className="text-gray-400">(comma-separated)</span>
              </label>
              <input {...register("skills")} className="input" placeholder="React, Node.js, Python, MongoDB..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
              <input {...register("github")} type="url" className="input" placeholder="https://github.com/..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea {...register("bio")} rows={3} maxLength={500} className="input resize-none" placeholder="Brief intro about yourself..." />
            </div>

            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
