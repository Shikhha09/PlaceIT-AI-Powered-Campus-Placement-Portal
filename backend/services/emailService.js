const nodemailer = require("nodemailer");

const isEmailConfigured = () => {
  return (
    process.env.MAIL_HOST &&
    process.env.MAIL_USER &&
    process.env.MAIL_PASS &&
    process.env.MAIL_USER !== "your_mailtrap_user" &&
    process.env.MAIL_PASS !== "your_mailtrap_pass"
  );
};

const getTransporter = () => {
  if (!isEmailConfigured()) return null;

  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT) || 587,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
};

// sendEmail NEVER throws — email failure must never crash a request
const sendEmail = async ({ to, subject, html }) => {
  if (!isEmailConfigured()) {
    // Graceful fallback — just log it
    console.log(`\n📧 [EMAIL LOG - configure SMTP to send real emails]`);
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}\n`);
    return;
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.MAIL_FROM || "PlaceIT <noreply@placeit.app>",
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    // Log but NEVER throw — so the main operation (status update etc) still succeeds
    console.error(`📧 Email failed (non-fatal): ${err.message}`);
  }
};

// ── Email Templates ────────────────────────────────────────────────────────────

const emailTemplates = {
  applicationReceived: (studentName, jobTitle, companyName) => ({
    subject: `Application Received – ${jobTitle} at ${companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px">
        <h2 style="color:#2563eb">Application Received ✅</h2>
        <p>Hi <strong>${studentName}</strong>,</p>
        <p>Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been received.</p>
        <p>You will be notified when the company reviews your application.</p>
        <hr/>
        <small style="color:#888">PlaceIT</small>
      </div>`,
  }),

  statusUpdated: (studentName, jobTitle, newStatus, companyName) => ({
    subject: `Application Update – ${jobTitle} at ${companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px">
        <h2 style="color:#2563eb">Application Status Update</h2>
        <p>Hi <strong>${studentName}</strong>,</p>
        <p>Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been updated to:</p>
        <p style="font-size:20px;font-weight:bold;color:${
          newStatus === "offered" ? "#16a34a" :
          newStatus === "rejected" ? "#dc2626" : "#2563eb"
        }">
          ${newStatus.toUpperCase().replace("_", " ")}
        </p>
        <p>Log in to your dashboard to view more details.</p>
        <hr/>
        <small style="color:#888">PlaceIT</small>
      </div>`,
  }),

  interviewScheduled: (studentName, jobTitle, companyName, scheduledAt, mode, meetLink, venue) => ({
    subject: `Interview Scheduled – ${jobTitle} at ${companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px">
        <h2 style="color:#7c3aed">Interview Scheduled 🎯</h2>
        <p>Hi <strong>${studentName}</strong>,</p>
        <p>Your interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been scheduled.</p>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;font-weight:bold">Date & Time:</td><td>${new Date(scheduledAt).toLocaleString("en-IN")}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Mode:</td><td>${mode.toUpperCase()}</td></tr>
          ${meetLink ? `<tr><td style="padding:8px;font-weight:bold">Meet Link:</td><td><a href="${meetLink}">${meetLink}</a></td></tr>` : ""}
          ${venue ? `<tr><td style="padding:8px;font-weight:bold">Venue:</td><td>${venue}</td></tr>` : ""}
        </table>
        <p>Best of luck! 🚀</p>
        <hr/>
        <small style="color:#888">PlaceIT</small>
      </div>`,
  }),

  accountApproved: (userName, role) => ({
    subject: "Account Approved – PlaceIT",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px">
        <h2 style="color:#16a34a">Account Approved ✅</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Your <strong>${role}</strong> account has been approved. You can now log in and access the portal.</p>
        <hr/>
        <small style="color:#888">PlaceIT</small>
      </div>`,
  }),
};

module.exports = { sendEmail, emailTemplates };
