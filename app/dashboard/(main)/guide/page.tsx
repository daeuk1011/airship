import Link from "next/link";

const docs = [
  {
    slug: "ota-publish-guide",
    title: "OTA Publish Guide",
    description: "Bundle build부터 production promote까지 전체 배포 워크플로우",
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
    slug: "staging-checklist",
    title: "Staging Verification Checklist",
    description: "iOS/Android 크로스 플랫폼 스테이징 검증 절차",
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
    description: "AWS EC2 모니터링, 알람 설정, 롤백 런북",
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
      <p className="text-sm text-foreground/50 mb-8">
        Airship OTA 서버 운영에 필요한 가이드 문서
      </p>
      <div className="space-y-3">
        {docs.map((doc) => (
          <Link
            key={doc.slug}
            href={`/dashboard/guide/${doc.slug}`}
            className="flex items-start gap-4 p-4 rounded-lg border border-foreground/10 hover:border-foreground/20 hover:bg-foreground/[0.02] transition-colors group"
          >
            <div className="mt-0.5 p-2 rounded-md bg-foreground/[0.04] text-foreground/40 group-hover:text-foreground/60 transition-colors shrink-0">
              {doc.icon}
            </div>
            <div>
              <p className="font-medium text-sm group-hover:text-foreground transition-colors">
                {doc.title}
              </p>
              <p className="text-xs text-foreground/50 mt-1 leading-relaxed">
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
              className="ml-auto mt-1 text-foreground/20 group-hover:text-foreground/40 transition-colors shrink-0"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
