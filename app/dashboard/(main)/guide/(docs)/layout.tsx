import { BackLink } from "@/shared/ui/back-link";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-8 max-w-4xl">
      <BackLink href="/dashboard/guide">Docs</BackLink>
      <article className="mt-6">{children}</article>
    </div>
  );
}
