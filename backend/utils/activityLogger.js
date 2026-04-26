const ActivityLog = require("../models/ActivityLog");

const log = async ({ actor, actorRole, action, entity, entityId, meta, ip }) => {
  try {
    await ActivityLog.create({ actor, actorRole, action, entity, entityId, meta, ip });
  } catch (err) {
    // Never let logging failure break the app
    console.error("Activity log error:", err.message);
  }
};

module.exports = { log };
