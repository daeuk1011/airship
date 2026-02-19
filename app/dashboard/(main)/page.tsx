import { db } from "@/shared/libs/db";
import { apps, updates, channels, channelAssignments, rollbackHistory } from "@/shared/libs/db/schema";
import { count, desc, eq, gte } from "drizzle-orm";
import { Card, CardList } from "@/shared/ui/card";
import { timeAgo, formatAbsolute } from "@/shared/utils/time";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function DashboardOverview() {
  const [appCount] = db.select({ value: count() }).from(apps).all();
  const [updateCount] = db.select({ value: count() }).from(updates).all();
  const [channelCount] = db.select({ value: count() }).from(channels).all();

  const [iosUpdateCount] = db
    .select({ value: count() })
    .from(updates)
    .where(eq(updates.platform, "ios"))
    .all();
  const [androidUpdateCount] = db
    .select({ value: count() })
    .from(updates)
    .where(eq(updates.platform, "android"))
    .all();
  const sevenDaysAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
  const [recentRollbackCount] = db
    .select({ value: count() })
    .from(rollbackHistory)
    .where(gte(rollbackHistory.createdAt, sevenDaysAgo))
    .all();

  const stats = [
    {
      label: "Apps",
      value: appCount.value,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      label: "Updates",
      value: updateCount.value,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 16 12 12 8 16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
      ),
    },
    {
      label: "Channels",
      value: channelCount.value,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="6" y1="3" x2="6" y2="15" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M18 9a9 9 0 0 1-9 9" />
        </svg>
      ),
    },
  ];

  const subStats = [
    { label: "iOS Updates", value: iosUpdateCount.value },
    { label: "Android Updates", value: androidUpdateCount.value },
    { label: "Rollbacks (7d)", value: recentRollbackCount.value },
  ];

  const recentUpdates = db
    .select({
      id: updates.id,
      platform: updates.platform,
      runtimeVersion: updates.runtimeVersion,
      createdAt: updates.createdAt,
      appId: updates.appId,
    })
    .from(updates)
    .orderBy(desc(updates.createdAt))
    .limit(5)
    .all();

  const appMap = new Map<string, { name: string; appKey: string }>();
  for (const u of recentUpdates) {
    if (!appMap.has(u.appId)) {
      const app = db
        .select({ name: apps.name, appKey: apps.appKey })
        .from(apps)
        .where(eq(apps.id, u.appId))
        .get();
      if (app) appMap.set(u.appId, app);
    }
  }

  // Get channel names for recent updates
  const updateChannelMap = new Map<string, string[]>();
  if (recentUpdates.length > 0) {
    const allChannels = db.select().from(channels).all();
    for (const ch of allChannels) {
      const assignments = db
        .select()
        .from(channelAssignments)
        .where(eq(channelAssignments.channelId, ch.id))
        .all();
      for (const a of assignments) {
        const existing = updateChannelMap.get(a.updateId) ?? [];
        existing.push(ch.name);
        updateChannelMap.set(a.updateId, existing);
      }
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Overview</h1>
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/[0.06] rounded-full blur-xl pointer-events-none" />
            <div className="absolute top-4 right-4 text-foreground-3">
              {stat.icon}
            </div>
            <p className="text-xs uppercase tracking-wider text-foreground-2">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mt-3">
        {subStats.map((stat) => (
          <div key={stat.label} className="px-4 py-3 rounded-lg bg-surface-1 border-l-2 border-white/[0.08]">
            <p className="text-xs text-foreground-3">{stat.label}</p>
            <p className="text-lg font-semibold mt-0.5">{stat.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mt-8 mb-3">Recent Updates</h2>
      {recentUpdates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="glass rounded-xl p-4 mb-3">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-foreground-3"
            >
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
          </div>
          <p className="text-foreground-2 text-sm">No updates yet</p>
          <p className="text-foreground-3 text-xs mt-1">
            Upload your first update from an app page
          </p>
        </div>
      ) : (
        <CardList>
          {recentUpdates.map((update) => {
            const app = appMap.get(update.appId);
            const chNames = updateChannelMap.get(update.id) ?? [];
            return (
              <Link
                key={update.id}
                href={`/dashboard/apps/${app?.appKey}/updates/${update.id}`}
                className="flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{app?.name ?? "Unknown"}</p>
                  <p className="text-xs text-foreground-2">
                    {update.platform} &middot; rv {update.runtimeVersion}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {chNames.map((ch) => (
                    <span
                      key={ch}
                      className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20"
                    >
                      {ch}
                    </span>
                  ))}
                  <span
                    className="text-xs text-foreground-3"
                    title={formatAbsolute(update.createdAt)}
                  >
                    {timeAgo(update.createdAt)}
                  </span>
                </div>
              </Link>
            );
          })}
        </CardList>
      )}
    </div>
  );
}
