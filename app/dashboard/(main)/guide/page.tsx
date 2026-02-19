import Link from "next/link";

const docs = [
  {
    slug: "quick-start",
    title: "Quick Start (10 min)",
    description: "Fastest path from first login to first OTA delivery",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    slug: "ota-publish-guide",
    title: "OTA Publish Guide",
    description: "End-to-end workflow from bundle export to production deployment",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 16 12 12 8 16" />
        <line x1="12" y1="12" x2="12" y2="21" />
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
      </svg>
    ),
  },
  {
    slug: "runtime-version-guard",
    title: "Runtime Version Guard (App Repo)",
    description: "PR guard template that enforces runtimeVersion bumps for native changes",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    slug: "staging-checklist",
    title: "Staging Verification Checklist",
    description: "Cross-platform staging verification procedures for iOS and Android",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    slug: "production-operations",
    title: "Production Operations Checklist",
    description: "Monitoring, alarms, and rollback runbook for AWS EC2",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
];

export default function GuidePage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Docs</h1>
      <p className="text-sm text-foreground-2 mb-8">
        Guides for operating the Airship OTA server
      </p>
      <div className="space-y-3">
        {docs.map((doc) => (
          <Link
            key={doc.slug}
            href={`/dashboard/guide/${doc.slug}`}
            className="flex items-start gap-4 p-4 rounded-xl glass hover:border-white/[0.12] transition-all group"
          >
            <div className="mt-0.5 p-2 rounded-lg bg-white/[0.04] text-foreground-3 group-hover:text-accent group-hover:bg-accent/10 transition-colors shrink-0">
              {doc.icon}
            </div>
            <div>
              <p className="font-medium text-sm group-hover:text-accent transition-colors">
                {doc.title}
              </p>
              <p className="text-xs text-foreground-2 mt-1 leading-relaxed">
                {doc.description}
              </p>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-auto mt-1 text-foreground-3 group-hover:text-foreground-2 transition-colors shrink-0"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
