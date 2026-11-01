// Remove contact details before text is sent to an external LLM provider.
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL = /\b(?:https?:\/\/|www\.)\S+/gi;
// 10 digits in a row, or 5-5 / 3-3-4 groups, optional +country code. Years like
// "2023-2027" are not matched.
const PHONE = /(?:\+\d{1,3}[\s-]?)?(?:\d{10}|\d{5}[\s-]\d{5}|\d{3}[\s-]\d{3}[\s-]\d{4})(?!\d)/g;

const maskPII = (text) =>
  String(text || "").replace(EMAIL, "[email]").replace(URL, "[link]").replace(PHONE, "[phone]");

module.exports = { maskPII };
