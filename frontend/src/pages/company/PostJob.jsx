import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { jobsAPI } from "../../api";
import Navbar from "../../components/Navbar";
import toast from "react-hot-toast";

const BRANCHES = ["ALL", "CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "CHEM", "OTHER"];

export default function PostJob() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState(["ALL"]);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const toggleBranch = (b) => {
    if (b === "ALL") { setSelectedBranches(["ALL"]); return; }
    setSelectedBranches((prev) => {
      const without = prev.filter((x) => x !== "ALL");
      return without.includes(b) ? without.filter((x) => x !== b) : [...without, b];
    });
  };

  const onSubmit = async (data) => {
    if (selectedBranches.length === 0) return toast.error("Select at least one branch.");
    setLoading(true);
    try {
      const skills = data.requiredSkills.split(",").map((s) => s.trim()).filter(Boolean);
      await jobsAPI.create({ ...data, requiredSkills: skills, allowedBranches: selectedBranches, minCGPA: parseFloat(data.minCGPA) });
      toast.success("Job posted successfully!");
      navigate("/company/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to post job.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Post a New Job</h1>
        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
              <input {...register("title", { required: "Title is required" })} className="input" placeholder="Full Stack Developer" />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Description *</label>
              <textarea {...register("description", { required: "Description is required" })} rows={5} className="input resize-none"
                placeholder="Describe the role, responsibilities, and what you're looking for..." />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills * <span className="text-gray-400">(comma-separated)</span></label>
              <input {...register("requiredSkills", { required: "Skills are required" })} className="input" placeholder="React, Node.js, MongoDB, Docker" />
              {errors.requiredSkills && <p className="text-red-500 text-xs mt-1">{errors.requiredSkills.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum CGPA *</label>
                <input {...register("minCGPA", { required: "CGPA is required", min: 0, max: 10 })} type="number" step="0.1" className="input" placeholder="7.0" />
                {errors.minCGPA && <p className="text-red-500 text-xs mt-1">{errors.minCGPA.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTC / Stipend *</label>
                <input {...register("ctc", { required: "CTC is required" })} className="input" placeholder="8-12 LPA" />
                {errors.ctc && <p className="text-red-500 text-xs mt-1">{errors.ctc.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                <input {...register("location", { required: "Location is required" })} className="input" placeholder="Bangalore" />
                {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Type *</label>
                <select {...register("jobType")} className="input">
                  <option value="full-time">Full-Time</option>
                  <option value="internship">Internship</option>
                  <option value="contract">Contract</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Application Deadline *</label>
                <input {...register("deadline", { required: "Deadline is required" })} type="date" className="input"
                  min={new Date().toISOString().split("T")[0]} />
                {errors.deadline && <p className="text-red-500 text-xs mt-1">{errors.deadline.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Branches</label>
              <div className="flex flex-wrap gap-2">
                {BRANCHES.map((b) => (
                  <button key={b} type="button" onClick={() => toggleBranch(b)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                      selectedBranches.includes(b) ? "bg-primary-600 text-white border-primary-600" : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:bg-gray-800/50"
                    }`}>
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Posting..." : "Post Job"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
