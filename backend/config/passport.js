const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

// Only configure if Google credentials are set
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.SERVER_URL || "http://localhost:5000"}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;

          // Check if user exists
          let user = await User.findOne({ email });

          if (user) {
            // Existing user — allow login only if approved
            return done(null, user);
          }

          // New user — create with Google info, needs admin approval
          user = await User.create({
            name: profile.displayName,
            email,
            password: require("crypto").randomBytes(32).toString("hex"), // random password
            role: "student", // default role — can be changed
            emailVerified: true, // Google verifies email
            isApproved: false,
            googleId: profile.id,
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

module.exports = passport;
