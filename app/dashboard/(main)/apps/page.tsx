import { db } from "@/shared/libs/db";
import { apps, updates } from "@/shared/libs/db/schema";
import { eq, count, max } from "drizzle-orm";
import Link from "next/link";
import { CreateAppForm } from "@/features/apps/components/create-app-form";
import { CardList } from "@/shared/ui/card";
import { timeAgo, formatAbsolute } from "@/shared/utils/time";

export const dynamic = "force-dynamic";

export default function AppsPage() {
  const appList = db.select().from(apps).all();

  const appStats = new Map<
    string,
    { updateCount: number; lastUpdate: number | null }
  >();
  for (const app of appList) {
    const [result] = db
      .select({
        updateCount: count(),
        lastUpdate: max(updates.createdAt),
      })
      .from(updates)
      .where(eq(updates.appId, app.id))
      .all();
    appStats.set(app.id, {
      updateCount: result.updateCount,
      lastUpdate: result.lastUpdate,
    });
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Apps</h1>
      </div>
      <p className="text-sm text-foreground-2 mb-6">Manage your applications and their OTA updates</p>

      <CreateAppForm />

      <div className="mt-8">
        {appList.length === 0 ? (
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
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <p className="text-foreground-2 text-sm">No apps yet</p>
            <p className="text-foreground-3 text-xs mt-1">
              Create your first app using the form above
            </p>
          </div>
        ) : (
          <CardList>
            {appList.map((app) => {
              const stats = appStats.get(app.id);
              return (
                <Link
                  key={app.id}
                  href={`/dashboard/apps/${app.appKey}`}
                  className="flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors group"
                >
                  <div>
                    <p className="font-medium group-hover:text-accent transition-colors">{app.name}</p>
                    <p className="text-sm text-foreground-2">{app.appKey}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {stats && stats.updateCount > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                        {stats.updateCount} update{stats.updateCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    <span
                      className="text-xs text-foreground-3"
                      title={
                        stats?.lastUpdate
                          ? formatAbsolute(stats.lastUpdate)
                          : undefined
                      }
                    >
                      {stats?.lastUpdate
                        ? timeAgo(stats.lastUpdate)
                        : new Date(app.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </CardList>
        )}
      </div>
    </div>
  );
}
