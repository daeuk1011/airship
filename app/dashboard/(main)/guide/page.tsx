import Link from "next/link";
import { Card } from "@/shared/ui/card";

const docs = [
  {
    slug: "ota-publish-guide",
    title: "OTA Publish Guide",
    description: "Bundle build to production promote workflow",
  },
  {
    slug: "staging-checklist",
    title: "Staging Verification Checklist",
    description: "iOS/Android cross-platform staging verification",
  },
  {
    slug: "production-operations",
    title: "Production Operations Checklist",
    description: "AWS EC2 monitoring, alarms, and rollback runbook",
  },
];

export default function GuidePage() {
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Docs</h1>
      <div className="space-y-2">
        {docs.map((doc) => (
          <Link key={doc.slug} href={`/dashboard/guide/${doc.slug}`}>
            <Card className="hover:bg-foreground/[0.02] transition-colors cursor-pointer">
              <p className="text-sm font-medium">{doc.title}</p>
              <p className="text-xs text-foreground/50 mt-1">
                {doc.description}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
