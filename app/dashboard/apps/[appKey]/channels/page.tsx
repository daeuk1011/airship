import { db } from "@/lib/db";
import { apps, channels, channelAssignments, updates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ChannelsPage({
  params,
}: {
  params: Promise<{ appKey: string }>;
}) {
  const { appKey } = await params;

  const app = db.select().from(apps).where(eq(apps.appKey, appKey)).get();

  if (!app) notFound();

  const channelList = db
    .select()
    .from(channels)
    .where(eq(channels.appId, app.id))
    .all();

  const channelsWithAssignments = channelList.map((ch) => {
    const assignments = db
      .select()
      .from(channelAssignments)
      .where(eq(channelAssignments.channelId, ch.id))
      .all();

    const enrichedAssignments = assignments.map((a) => {
      const update = db
        .select()
        .from(updates)
        .where(eq(updates.id, a.updateId))
        .get();
      return { ...a, update };
    });

    return { ...ch, assignments: enrichedAssignments };
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/apps/${appKey}`}
          className="text-sm text-foreground/50 hover:text-foreground"
        >
          &larr; {app.name}
        </Link>
        <h1 className="text-2xl font-bold mt-2">Channels</h1>
      </div>

      {channelsWithAssignments.length === 0 ? (
        <p className="text-foreground/50 text-sm">No channels.</p>
      ) : (
        <div className="space-y-4">
          {channelsWithAssignments.map((ch) => (
            <div
              key={ch.id}
              className="border border-foreground/10 rounded-lg p-5"
            >
              <h3 className="font-semibold text-lg">{ch.name}</h3>
              <p className="text-xs text-foreground/40 mb-3">
                Created {new Date(ch.createdAt).toLocaleDateString()}
              </p>

              {ch.assignments.length === 0 ? (
                <p className="text-sm text-foreground/50">
                  No active assignments.
                </p>
              ) : (
                <div className="space-y-2">
                  {ch.assignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between bg-foreground/[0.03] rounded px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="text-foreground/50">
                          rv {a.runtimeVersion}
                        </span>
                        <span className="mx-2 text-foreground/30">&rarr;</span>
                        <Link
                          href={`/dashboard/apps/${appKey}/updates/${a.updateId}`}
                          className="font-mono text-xs hover:underline"
                        >
                          {a.updateId.slice(0, 8)}...
                        </Link>
                        {a.update && (
                          <span className="text-foreground/40 ml-2">
                            ({a.update.platform})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-foreground/50">
                          {a.rolloutPercent}%
                        </span>
                        <span className="text-xs text-foreground/40">
                          {new Date(a.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
