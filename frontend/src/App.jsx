import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import OAuthCallback from "./pages/OAuthCallback";
import ProtectedRoute from "./routes/ProtectedRoute";

// Student pages
import StudentDashboard from "./pages/student/Dashboard";
import StudentJobs from "./pages/student/Jobs";
import StudentApplications from "./pages/student/Applications";
import StudentProfile from "./pages/student/Profile";
import SkillGap from "./pages/student/SkillGap";
import PlacementCalendar from "./pages/student/Calendar";
import SavedJobs from "./pages/student/SavedJobs";

// Company pages
import CompanyDashboard from "./pages/company/Dashboard";
import PostJob from "./pages/company/PostJob";
import Applicants from "./pages/company/Applicants";
import CompanyInterviews from "./pages/company/Interviews";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminApprovals from "./pages/admin/Approvals";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminUsers from "./pages/admin/Users";

const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === "student") return <Navigate to="/student/dashboard" />;
  if (user.role === "company") return <Navigate to="/company/dashboard" />;
  if (user.role === "admin") return <Navigate to="/admin/dashboard" />;
  return <Navigate to="/login" />;
};

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<RoleRedirect />} />

      {/* Student routes */}
      <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/jobs" element={<StudentJobs />} />
        <Route path="/student/applications" element={<StudentApplications />} />
        <Route path="/student/profile" element={<StudentProfile />} />
        <Route path="/student/skill-gap/:jobId" element={<SkillGap />} />
        <Route path="/student/calendar" element={<PlacementCalendar />} />
        <Route path="/student/saved" element={<SavedJobs />} />
      </Route>

      {/* Company routes */}
      <Route element={<ProtectedRoute allowedRoles={["company"]} />}>
        <Route path="/company/dashboard" element={<CompanyDashboard />} />
        <Route path="/company/post-job" element={<PostJob />} />
        <Route path="/company/applicants/:jobId" element={<Applicants />} />
        <Route path="/company/interviews" element={<CompanyInterviews />} />
      </Route>

      {/* Admin routes */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/approvals" element={<AdminApprovals />} />
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/admin/users" element={<AdminUsers />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
