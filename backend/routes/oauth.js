const express = require("express");
const router = express.Router();
const passport = require("../config/passport");
const { generateToken } = require("../middleware/auth");

// Only register Google routes if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {

  // ── GET /api/auth/google ─────────────────────────────────────────────────
  // Redirects user to Google sign-in page
  router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"], session: false })
  );

  // ── GET /api/auth/google/callback ────────────────────────────────────────
  // Google redirects here after user signs in
  router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/login?error=google_failed" }),
    (req, res) => {
      const user = req.user;

      if (!user.isApproved) {
        // Redirect to frontend with pending message
        return res.redirect(
          `${process.env.CLIENT_URL}/login?google=pending&name=${encodeURIComponent(user.name)}`
        );
      }

      // Generate JWT and redirect to frontend with token
      const token = generateToken(user._id);
      res.redirect(
        `${process.env.CLIENT_URL}/oauth/callback?token=${token}&role=${user.role}&name=${encodeURIComponent(user.name)}`
      );
    }
  );
} else {
  // Graceful fallback when Google OAuth is not configured
  router.get("/google", (req, res) => {
    res.status(503).json({ error: "Google OAuth is not configured on this server." });
  });
}

module.exports = router;
