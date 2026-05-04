import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../api";
import { Spinner } from "../components/common";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");
    const role = params.get("role");
    const name = params.get("name");

    if (!token) {
      navigate("/login?error=oauth_failed");
      return;
    }

    // Fetch full user data using the token
    authAPI.me(token).then((res) => {
      login(res.data.user, token);
      const dest =
        role === "admin" ? "/admin/dashboard" :
        role === "company" ? "/company/dashboard" :
        "/student/dashboard";
      navigate(dest, { replace: true });
    }).catch(() => {
      navigate("/login?error=oauth_failed");
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center gap-4">
      <Spinner size="lg" />
      <p className="text-gray-600 dark:text-gray-400 text-sm">Signing you in with Google...</p>
    </div>
  );
}
