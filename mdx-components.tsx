import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold mt-8 mb-4 first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg font-semibold mt-10 mb-3 pb-2 border-b border-foreground/10">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-medium mt-6 mb-2">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-sm text-foreground/80 mb-4 leading-relaxed">
        {children}
      </p>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-blue-500 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul className="text-sm text-foreground/80 mb-4 space-y-1.5 pl-5 list-disc marker:text-foreground/30">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="text-sm text-foreground/80 mb-4 space-y-1.5 pl-5 list-decimal marker:text-foreground/40">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed pl-1">{children}</li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-foreground/20 pl-4 text-sm text-foreground/60 mb-4 [&>p]:mb-0">
        {children}
      </blockquote>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    code: ({ children }) => (
      <code className="bg-foreground/[0.06] px-1.5 py-0.5 rounded text-[13px] font-mono text-foreground/90">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="bg-foreground/[0.04] border border-foreground/[0.06] rounded-lg p-4 text-[13px] leading-relaxed overflow-x-auto font-mono text-foreground/80 mb-4 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[13px]">
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto mb-4 border border-foreground/10 rounded-lg">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-foreground/[0.04]">{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="text-foreground/70">{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr className="border-b border-foreground/[0.06] last:border-b-0">
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className="text-left py-2.5 px-3 font-medium text-xs uppercase tracking-wider text-foreground/60">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="py-2.5 px-3 text-sm">{children}</td>
    ),
    hr: () => <hr className="border-foreground/10 my-8" />,
    ...components,
  };
}
