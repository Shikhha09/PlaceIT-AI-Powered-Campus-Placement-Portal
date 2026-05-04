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

      {/* Theme toggle */}
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

            {/* Google Sign In */}
            <a
              href={`${import.meta.env.VITE_API_URL?.replace("/api","") || "http://localhost:5000"}/api/auth/google`}
              className="flex items-center justify-center gap-3 w-full py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </a>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-400 dark:text-gray-500">or sign in with email</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
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

          {/* Demo Access */}
          <div className="mt-5 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center mb-3 uppercase tracking-wide">
              ⚡ Quick Demo Access
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onSubmit({ email: "admin@campus.local", password: "Password@123" })}
                className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800/50
                           bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40
                           transition-colors cursor-pointer"
              >
                <span className="text-lg">👨‍💼</span>
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">Admin</span>
                <span className="text-xs text-purple-500 dark:text-purple-500">TPO View</span>
              </button>

              <button
                type="button"
                onClick={() => onSubmit({ email: "hr@technova.com", password: "Password@123" })}
                className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800/50
                           bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40
                           transition-colors cursor-pointer"
              >
                <span className="text-lg">🏢</span>
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Company</span>
                <span className="text-xs text-blue-500 dark:text-blue-500">HR View</span>
              </button>

              <button
                type="button"
                onClick={() => onSubmit({ email: "aarav@student.edu", password: "Password@123" })}
                className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-green-200 dark:border-green-800/50
                           bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40
                           transition-colors cursor-pointer"
              >
                <span className="text-lg">🎓</span>
                <span className="text-xs font-semibold text-green-700 dark:text-green-400">Student</span>
                <span className="text-xs text-green-500 dark:text-green-500">Student View</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-primary-300 dark:text-gray-600 text-xs mt-6">
          © 2025 PlaceIT · AI-Powered Placement Platform
        </p>
      </div>
    </div>
  );
}
