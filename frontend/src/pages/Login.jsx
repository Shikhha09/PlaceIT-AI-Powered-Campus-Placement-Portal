import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { authAPI } from "../api";
import { Zap, Sun, Moon } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authAPI.login(data);
      login(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      const role = res.data.user.role;
      navigate(
        role === "admin" ? "/admin/dashboard" :
        role === "company" ? "/company/dashboard" :
        "/student/dashboard"
      );
    } catch (err) {
      toast.error(err.response?.data?.error || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-blue-800
                    dark:from-gray-950 dark:via-gray-900 dark:to-gray-950
                    flex items-center justify-center p-4 transition-colors">

      {/* Theme toggle — top right */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2 rounded-lg bg-white/20 dark:bg-gray-700/60
                   text-white dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-600
                   transition-colors backdrop-blur-sm"
        title="Toggle theme"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Zap size={32} className="text-primary-600 fill-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Place<span className="text-blue-300">IT</span>
          </h1>
          <p className="text-primary-200 dark:text-gray-400 mt-1 text-sm">
            AI-Powered Campus Placement Portal
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl dark:shadow-gray-950 p-8
                        border border-transparent dark:border-gray-700/50">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                {...register("email", { required: "Email is required" })}
                type="email"
                className="input"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                {...register("password", { required: "Password is required" })}
                type="password"
                className="input"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
              Register
            </Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-5 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-xs text-gray-500 dark:text-gray-400 space-y-1.5 border border-gray-100 dark:border-gray-700/40">
            <p className="font-semibold text-gray-600 dark:text-gray-300 mb-2">🔑 Demo accounts:</p>
            <p><span className="font-medium text-purple-600 dark:text-purple-400">Admin:</span> admin@campus.local / Password@123</p>
            <p><span className="font-medium text-blue-600 dark:text-blue-400">Company:</span> hr@technova.com / Password@123</p>
            <p><span className="font-medium text-green-600 dark:text-green-400">Student:</span> aarav@student.edu / Password@123</p>
          </div>
        </div>

        <p className="text-center text-primary-300 dark:text-gray-600 text-xs mt-6">
          © 2025 PlaceIT · AI-Powered Placement Platform
        </p>
      </div>
    </div>
  );
}
