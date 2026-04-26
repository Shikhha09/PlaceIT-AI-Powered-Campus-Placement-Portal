import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { authAPI } from "../api";

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "CHEM", "OTHER"];

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("student");
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authAPI.register({ ...data, role });
      toast.success("Registration successful! Awaiting admin approval.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white shadow-lg rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-primary-600"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Place<span className="text-blue-300">IT</span></h1>
          <p className="text-primary-200 mt-1 text-sm">Create your account to get started</p>
        </div>

        <div className="card">
          {/* Role selector */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
            {["student", "company"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  role === r ? "bg-white shadow text-primary-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {r === "student" ? "🎓 Student" : "🏢 Company"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input {...register("name", { required: "Name is required", minLength: { value: 2, message: "Min 2 chars" } })} className="input" placeholder="John Doe" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input {...register("email", { required: "Email is required" })} type="email" className="input" placeholder="you@example.com" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                {...register("password", { required: "Password is required", minLength: { value: 8, message: "Min 8 characters" } })}
                type="password" className="input" placeholder="Min 8 characters"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {/* Student-specific fields */}
            {role === "student" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <select {...register("branch", { required: "Branch is required" })} className="input">
                    <option value="">Select branch</option>
                    {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                  {errors.branch && <p className="text-red-500 text-xs mt-1">{errors.branch.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CGPA</label>
                  <input
                    {...register("cgpa", { required: "CGPA is required", min: { value: 0, message: "Min 0" }, max: { value: 10, message: "Max 10" } })}
                    type="number" step="0.1" className="input" placeholder="8.5"
                  />
                  {errors.cgpa && <p className="text-red-500 text-xs mt-1">{errors.cgpa.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
                  <input
                    {...register("graduationYear", { required: "Year is required" })}
                    type="number" className="input" placeholder="2025"
                  />
                </div>
              </div>
            )}

            {/* Company-specific fields */}
            {role === "company" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input {...register("companyName", { required: "Company name is required" })} className="input" placeholder="TechNova Inc." />
                  {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <input {...register("industry")} className="input" placeholder="Software, Finance..." />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Registering..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
