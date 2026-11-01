const { isRealValue } = require("../utils/envCheck");
test.each([
  ["", false], [undefined, false], ["   ", false],
  ["your_supabase_url", false], ["replace_with_key", false],
  ["https://<project-ref>.supabase.co", false], ["mongodb+srv://<user>:<pw>@<cluster>.x", false],
  ["https://abcd.supabase.co", true], ["AC123realish", true], ["smtp.gmail.com", true],
])("isRealValue(%p) -> %p", (v, expected) => expect(isRealValue(v)).toBe(expected));
