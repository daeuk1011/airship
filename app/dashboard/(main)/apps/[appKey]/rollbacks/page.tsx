import { db } from "@/shared/libs/db";
import { apps, channels, updates, rollbackHistory } from "@/shared/libs/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/shared/ui/back-link";
import { CardList } from "@/shared/ui/card";
import { timeAgo, formatAbsolute } from "@/shared/utils/time";

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
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-foreground/20 mb-3"
          >
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          <p className="text-foreground/50 text-sm">No rollback history</p>
          <p className="text-foreground/30 text-xs mt-1">
            Rollbacks will appear here when you revert an update
          </p>
        </div>
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
                <span
                  className="text-xs text-foreground/40"
                  title={formatAbsolute(rb.createdAt)}
                >
                  {timeAgo(rb.createdAt)}
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
