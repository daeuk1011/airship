import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold mt-8 mb-4 first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg font-semibold mt-8 mb-3 pb-2 border-b border-foreground/10">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-medium mt-5 mb-2">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-sm text-foreground/80 mb-3 leading-relaxed">
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
      <ul className="list-disc list-inside text-sm text-foreground/80 mb-3 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside text-sm text-foreground/80 mb-3 space-y-1">
        {children}
      </ol>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-foreground/20 pl-4 text-sm text-foreground/60 mb-3">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="bg-foreground/5 px-1.5 py-0.5 rounded text-xs font-mono">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="bg-foreground/5 rounded-lg p-4 text-xs overflow-x-auto font-mono text-foreground/80 mb-3 [&_code]:bg-transparent [&_code]:p-0">
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto mb-3">
        <table className="w-full text-xs">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead>{children}</thead>,
    tbody: ({ children }) => (
      <tbody className="text-foreground/70">{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr className="border-b border-foreground/10">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="text-left py-2 px-2 font-medium">{children}</th>
    ),
    td: ({ children }) => <td className="py-2 px-2">{children}</td>,
    hr: () => <hr className="border-foreground/10 my-6" />,
    ...components,
  };
}
