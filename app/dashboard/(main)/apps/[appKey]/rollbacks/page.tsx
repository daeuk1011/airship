import { db } from "@/shared/libs/db";
import { apps, channels, updates, rollbackHistory } from "@/shared/libs/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/shared/ui/back-link";
import { CardList } from "@/shared/ui/card";

export const dynamic = "force-dynamic";

export default async function RollbackHistoryPage({
  params,
}: {
  params: Promise<{ appKey: string }>;
}) {
  const { appKey } = await params;

  const app = db.select().from(apps).where(eq(apps.appKey, appKey)).get();

  if (!app) notFound();

  const rollbacks = db
    .select()
    .from(rollbackHistory)
    .where(eq(rollbackHistory.appId, app.id))
    .orderBy(desc(rollbackHistory.createdAt))
    .all();

  const enriched = rollbacks.map((rb) => {
    const channel = db
      .select()
      .from(channels)
      .where(eq(channels.id, rb.channelId))
      .get();
    const fromUpdate = db
      .select()
      .from(updates)
      .where(eq(updates.id, rb.fromUpdateId))
      .get();
    const toUpdate = db
      .select()
      .from(updates)
      .where(eq(updates.id, rb.toUpdateId))
      .get();
    return { ...rb, channel, fromUpdate, toUpdate };
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <BackLink href={`/dashboard/apps/${appKey}`}>{app.name}</BackLink>
        <h1 className="text-2xl font-bold mt-2">Rollback History</h1>
      </div>

      {enriched.length === 0 ? (
        <p className="text-foreground/50 text-sm">No rollback history.</p>
      ) : (
        <CardList>
          {enriched.map((rb) => (
            <div key={rb.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {rb.channel && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-foreground/10">
                      {rb.channel.name}
                    </span>
                  )}
                  {rb.fromUpdate && (
                    <span className="text-xs text-foreground/50">
                      {rb.fromUpdate.platform} &middot; rv{" "}
                      {rb.fromUpdate.runtimeVersion}
                    </span>
                  )}
                </div>
                <span className="text-xs text-foreground/40">
                  {new Date(rb.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Link
                  href={`/dashboard/apps/${appKey}/updates/${rb.fromUpdateId}`}
                  className="font-mono text-xs hover:underline"
                >
                  {rb.fromUpdateId.slice(0, 8)}...
                  {rb.fromUpdate && (
                    <span className="text-foreground/40 ml-1">
                      {rb.fromUpdate.bundleHash.slice(0, 12)}
                    </span>
                  )}
                </Link>
                <span className="text-foreground/30">&rarr;</span>
                <Link
                  href={`/dashboard/apps/${appKey}/updates/${rb.toUpdateId}`}
                  className="font-mono text-xs hover:underline"
                >
                  {rb.toUpdateId.slice(0, 8)}...
                  {rb.toUpdate && (
                    <span className="text-foreground/40 ml-1">
                      {rb.toUpdate.bundleHash.slice(0, 12)}
                    </span>
                  )}
                </Link>
              </div>

              {rb.reason && (
                <p className="text-xs text-foreground/50 mt-2">{rb.reason}</p>
              )}
            </div>
          ))}
        </CardList>
      )}
    </div>
  );
}
