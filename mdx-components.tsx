import type { MDXComponents } from "mdx/types";
import { Children, isValidElement, type ReactNode } from "react";
import { CopyButton } from "@/shared/ui/copy-button";

function getNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getNodeText).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getNodeText(node.props.children ?? "");
  }

  return "";
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold mt-8 mb-4 first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg font-semibold mt-10 mb-3 pb-2 border-b border-white/[0.08]">
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
        className="text-accent hover:text-accent-bright transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul className="text-sm text-foreground/80 mb-4 space-y-1.5 pl-5 list-disc marker:text-foreground-3">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="text-sm text-foreground/80 mb-4 space-y-1.5 pl-5 list-decimal marker:text-foreground-3">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed pl-1">{children}</li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-accent/30 bg-accent/[0.03] pl-4 py-2 text-sm text-foreground-2 mb-4 rounded-r-lg [&>p]:mb-0">
        {children}
      </blockquote>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    code: ({ children }) => (
      <code className="bg-white/[0.06] text-accent px-1.5 py-0.5 rounded text-[13px] font-mono">
        {children}
      </code>
    ),
    pre: ({ children }) => {
      const codeText = Children.toArray(children).map(getNodeText).join("").trim();

      return (
        <div className="relative mb-4">
          <pre className="bg-[#0d1117] border border-white/[0.06] rounded-lg p-4 pr-12 text-[13px] leading-relaxed overflow-x-auto font-mono text-foreground/80 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[13px] [&_code]:text-foreground/80">
            {children}
          </pre>
          {codeText && (
            <div className="absolute top-2 right-2">
              <CopyButton text={codeText} />
            </div>
          )}
        </div>
      );
    },
    table: ({ children }) => (
      <div className="overflow-x-auto mb-4 border border-white/[0.08] rounded-xl">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-white/[0.04]">{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="text-foreground/70">{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr className="border-b border-white/[0.06] last:border-b-0">
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className="text-left py-2.5 px-3 font-medium text-xs uppercase tracking-wider text-foreground-2">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="py-2.5 px-3 text-sm">{children}</td>
    ),
    hr: () => <hr className="border-white/[0.08] my-8" />,
    ...components,
  };
}
