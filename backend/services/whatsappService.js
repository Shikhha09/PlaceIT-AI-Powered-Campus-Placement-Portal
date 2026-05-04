// WhatsApp notifications via Twilio
// Falls back gracefully if Twilio is not configured

const isConfigured =
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_WHATSAPP_FROM &&
  process.env.TWILIO_ACCOUNT_SID !== "your_twilio_sid";

let twilioClient;
if (isConfigured) {
  const twilio = require("twilio");
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  console.log("📱 WhatsApp notifications: Twilio configured");
} else {
  console.log("📱 WhatsApp notifications: Not configured (optional)");
}

// Send WhatsApp message — never throws, always falls back to console
const sendWhatsApp = async (to, message) => {
  if (!isConfigured || !to) {
    console.log(`📱 [WHATSAPP LOG] To: ${to || "no number"}\n   ${message}`);
    return;
  }

  try {
    // Twilio WhatsApp numbers must be in format: whatsapp:+91XXXXXXXXXX
    const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    const from = process.env.TWILIO_WHATSAPP_FROM;

    await twilioClient.messages.create({
      from: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
      to: formattedTo,
      body: message,
    });
    console.log(`📱 WhatsApp sent to ${to}`);
  } catch (err) {
    // Never crash the app for WhatsApp failures
    console.error(`📱 WhatsApp failed (non-fatal): ${err.message}`);
  }
};

// ── Message Templates ──────────────────────────────────────────────────────────

const whatsappTemplates = {
  applicationReceived: (studentName, jobTitle, companyName) =>
    `✅ *PlaceIT Notification*\n\nHi ${studentName}! Your application for *${jobTitle}* at *${companyName}* has been received.\n\nTrack your status at placeit.vercel.app 🚀`,

  statusUpdated: (studentName, jobTitle, newStatus, companyName) => {
    const emoji = newStatus === "offered" ? "🎉" : newStatus === "rejected" ? "❌" : "📋";
    return `${emoji} *PlaceIT Update*\n\nHi ${studentName}! Your application for *${jobTitle}* at *${companyName}* is now:\n\n*${newStatus.toUpperCase().replace("_"," ")}*\n\nLogin to view details: placeit.vercel.app`;
  },

  interviewScheduled: (studentName, jobTitle, companyName, scheduledAt, mode, meetLink) =>
    `🎯 *Interview Scheduled - PlaceIT*\n\nHi ${studentName}!\n\n*${jobTitle}* at *${companyName}*\n\n📅 ${new Date(scheduledAt).toLocaleString("en-IN")}\n💻 Mode: ${mode.toUpperCase()}${meetLink ? `\n🔗 ${meetLink}` : ""}\n\nBest of luck! 💪`,

  accountApproved: (userName) =>
    `✅ *Account Approved - PlaceIT*\n\nHi ${userName}! Your account has been approved. You can now login and start applying.\n\nplaceit.vercel.app`,
};

module.exports = { sendWhatsApp, whatsappTemplates };
