import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders model output as Markdown without trusting it:
//  - raw HTML in the text is skipped (never rendered)
//  - links are shown as plain text, not clickable (a model or an injected prompt could
//    plant a phishing link)
//  - images are never loaded (an image URL is a common way to leak data to a third party)
const components = {
  a: ({ children }) => <span className="underline decoration-dotted">{children}</span>,
  img: ({ alt }) => (alt ? <span className="italic">[image: {alt}]</span> : null),
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <h3 className="text-base font-bold mt-3 mb-1">{children}</h3>,
  h2: ({ children }) => <h3 className="text-base font-bold mt-3 mb-1">{children}</h3>,
  h3: ({ children }) => <h4 className="text-sm font-bold mt-3 mb-1">{children}</h4>,
  h4: ({ children }) => <h4 className="text-sm font-semibold mt-2 mb-1">{children}</h4>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-3 my-2 text-gray-600 dark:text-gray-300">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-gray-200 dark:border-gray-700" />,
  pre: ({ children }) => (
    <pre className="my-2 p-3 rounded-lg bg-gray-900 text-gray-100 text-xs overflow-x-auto [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit">
      {children}
    </pre>
  ),
  code: ({ className, children }) => (
    <code className={`${className || ""} px-1 py-0.5 rounded bg-gray-200/70 dark:bg-gray-700 text-[0.85em] font-mono`}>
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full text-xs border border-gray-200 dark:border-gray-700">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="px-2 py-1 text-left font-semibold bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">{children}</th>
  ),
  td: ({ children }) => <td className="px-2 py-1 border border-gray-200 dark:border-gray-700 align-top">{children}</td>,
};

export default function SafeMarkdown({ children }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
      {String(children ?? "")}
    </ReactMarkdown>
  );
}
