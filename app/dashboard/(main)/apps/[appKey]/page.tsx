import { db } from "@/shared/libs/db";
import { apps, updates, channels, channelAssignments, rollbackHistory } from "@/shared/libs/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/shared/ui/back-link";
import { Card, CardList } from "@/shared/ui/card";
import { UploadUpdateForm } from "@/features/updates/components/upload-update-form";

export const dynamic = "force-dynamic";

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ appKey: string }>;
}) {
  const { appKey } = await params;

  const app = db.select().from(apps).where(eq(apps.appKey, appKey)).get();

  if (!app) notFound();

  const updateList = db
    .select()
    .from(updates)
    .where(eq(updates.appId, app.id))
    .orderBy(desc(updates.createdAt))
    .all();

  const channelList = db
    .select()
    .from(channels)
    .where(eq(channels.appId, app.id))
    .all();

  // Build a map of updateId -> channel names
  const assignmentMap = new Map<string, string[]>();
  for (const ch of channelList) {
    const assignments = db
      .select()
      .from(channelAssignments)
      .where(eq(channelAssignments.channelId, ch.id))
      .all();

    for (const a of assignments) {
      const existing = assignmentMap.get(a.updateId) ?? [];
      existing.push(ch.name);
      assignmentMap.set(a.updateId, existing);
    }
  }

  const rollbackCount = db
    .select({ count: count() })
    .from(rollbackHistory)
    .where(eq(rollbackHistory.appId, app.id))
    .get()!.count;

  return (
    <div className="p-8">
      <div className="mb-6">
        <BackLink href="/dashboard/apps">Apps</BackLink>
        <h1 className="text-2xl font-bold mt-2">{app.name}</h1>
        <p className="text-sm text-foreground/50">{app.appKey}</p>
      </div>

      <div className="flex gap-2 mb-6">
        <Link
          href={`/dashboard/apps/${appKey}/channels`}
          className="px-3 py-1.5 text-sm border border-foreground/20 rounded-md hover:bg-foreground/5 transition-colors"
        >
          Channels ({channelList.length})
        </Link>
        <Link
          href={`/dashboard/apps/${appKey}/rollbacks`}
          className="px-3 py-1.5 text-sm border border-foreground/20 rounded-md hover:bg-foreground/5 transition-colors"
        >
          Rollback History ({rollbackCount})
        </Link>
      </div>

      <Card className="mb-6">
        <UploadUpdateForm appKey={appKey} />
      </Card>

      <h2 className="text-lg font-semibold mb-3">Updates</h2>

      {updateList.length === 0 ? (
        <p className="text-foreground/50 text-sm">No updates yet.</p>
      ) : (
        <CardList>
          {updateList.map((update) => (
            <Link
              key={update.id}
              href={`/dashboard/apps/${appKey}/updates/${update.id}`}
              className="flex items-center justify-between p-4 hover:bg-foreground/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    update.enabled ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <div>
                  <p className="text-sm font-mono">
                    {update.id.slice(0, 8)}...
                  </p>
                  <p className="text-xs text-foreground/50">
                    {update.platform} &middot; rv {update.runtimeVersion}
                    <span className="text-foreground/40 font-mono ml-1">
                      {update.bundleHash.slice(0, 12)}
                    </span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex gap-1">
                  {(assignmentMap.get(update.id) ?? []).map((ch) => (
                    <span
                      key={ch}
                      className="text-xs px-1.5 py-0.5 rounded bg-foreground/10"
                    >
                      {ch}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-foreground/40 mt-1">
                  {new Date(update.createdAt).toLocaleString()}
                </p>
              </div>
            </Link>
          ))}
        </CardList>
      )}
    </div>
  );
}
