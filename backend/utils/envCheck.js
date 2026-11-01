// Is an environment variable a real value rather than empty or a copied placeholder
// like "your_api_key", "replace_with_..." or "https://<project-ref>.supabase.co"?
// Optional integrations (Supabase, Twilio, email, Google login) use this so a
// freshly copied .env.example never crashes the app - the feature is just skipped.
const isRealValue = (v) => {
  if (typeof v !== "string") return false;
  const s = v.trim();
  return s.length > 0 && !/[<>]/.test(s) && !/^(your_|replace_|changeme|xxx)/i.test(s);
};
module.exports = { isRealValue };
