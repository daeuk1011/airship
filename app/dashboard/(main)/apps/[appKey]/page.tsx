import { db } from "@/shared/libs/db";
import { apps, updates, channels, channelAssignments, rollbackHistory } from "@/shared/libs/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { timeAgo, formatAbsolute } from "@/shared/utils/time";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/shared/ui/back-link";
import { Card, CardList } from "@/shared/ui/card";
import { UploadUpdateForm } from "@/features/updates/components/upload-update-form";
import { formatBytes } from "@/shared/utils/format";
import { DeleteAppButton } from "@/features/apps/components/delete-app-button";

export const dynamic = "force-dynamic";

export default async function AppDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ appKey: string }>;
  searchParams: Promise<{ platform?: string; view?: string }>;
}) {
  const { appKey } = await params;
  const { platform: platformFilter, view } = await searchParams;
  const isGrouped = view === "grouped";

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

  const filteredUpdates = platformFilter
    ? updateList.filter((u) => u.platform === platformFilter)
    : updateList;

  const rollbackCount = db
    .select({ count: count() })
    .from(rollbackHistory)
    .where(eq(rollbackHistory.appId, app.id))
    .get()!.count;

  // Aggregate runtime versions from updateList
  const rvMap = new Map<string, { platform: string; count: number; hasChannel: boolean }>();
  for (const u of updateList) {
    const key = `${u.runtimeVersion}__${u.platform}`;
    const existing = rvMap.get(key);
    if (existing) {
      existing.count++;
      if (!existing.hasChannel && assignmentMap.has(u.id)) existing.hasChannel = true;
    } else {
      rvMap.set(key, {
        platform: u.platform,
        count: 1,
        hasChannel: assignmentMap.has(u.id),
      });
    }
  }
  const runtimeVersions = [...rvMap.entries()]
    .map(([key, data]) => ({
      version: key.split("__")[0],
      ...data,
    }))
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));

  return (
    <div className="p-8">
      <div className="mb-6">
        <BackLink href="/dashboard/apps">Apps</BackLink>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold">{app.name}</h1>
            <p className="text-sm text-foreground-2">{app.appKey}</p>
          </div>
          <DeleteAppButton appKey={appKey} appName={app.name} />
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <Link
          href={`/dashboard/apps/${appKey}/channels`}
          className="px-3 py-1.5 text-sm border border-white/10 rounded-lg hover:border-white/20 hover:bg-white/[0.04] transition-all"
        >
          Channels ({channelList.length})
        </Link>
        <Link
          href={`/dashboard/apps/${appKey}/rollbacks`}
          className="px-3 py-1.5 text-sm border border-white/10 rounded-lg hover:border-white/20 hover:bg-white/[0.04] transition-all"
        >
          Rollback History ({rollbackCount})
        </Link>
      </div>

      {runtimeVersions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-foreground-2 uppercase tracking-wider mb-2">
            Runtime Versions
          </h2>
          <div className="flex flex-wrap gap-2">
            {runtimeVersions.map((rv) => (
              <div
                key={`${rv.version}-${rv.platform}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-1 text-sm"
              >
                {rv.hasChannel && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                )}
                <span className="font-mono text-xs">{rv.version}</span>
                <span className="text-foreground-3 text-xs">
                  {rv.platform === "ios" ? "iOS" : "Android"}
                </span>
                <span className="text-foreground-3 text-xs">
                  {rv.count} update{rv.count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card className="mb-6">
        <UploadUpdateForm appKey={appKey} />
      </Card>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Updates</h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {["flat", "grouped"].map((v) => {
              const isActive = v === "flat" ? !isGrouped : isGrouped;
              const sp = new URLSearchParams();
              if (platformFilter) sp.set("platform", platformFilter);
              if (v === "grouped") sp.set("view", "grouped");
              const qs = sp.toString();
              return (
                <Link
                  key={v}
                  href={`/dashboard/apps/${appKey}${qs ? `?${qs}` : ""}`}
                  className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                    isActive
                      ? "bg-accent text-[#08090d] font-medium"
                      : "text-foreground-2 hover:bg-white/[0.06]"
                  }`}
                >
                  {v === "flat" ? "Flat" : "Grouped"}
                </Link>
              );
            })}
          </div>
          <div className="flex gap-1">
            {["all", "ios", "android"].map((p) => {
              const isActive =
                p === "all" ? !platformFilter : platformFilter === p;
              const sp = new URLSearchParams();
              if (p !== "all") sp.set("platform", p);
              if (isGrouped) sp.set("view", "grouped");
              const qs = sp.toString();
              return (
                <Link
                  key={p}
                  href={`/dashboard/apps/${appKey}${qs ? `?${qs}` : ""}`}
                  className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                    isActive
                      ? "bg-accent text-[#08090d] font-medium"
                      : "text-foreground-2 hover:bg-white/[0.06]"
                  }`}
                >
                  {p === "all" ? "All" : p === "ios" ? "iOS" : "Android"}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {filteredUpdates.length === 0 ? (
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
            Upload a bundle using the form above
          </p>
        </div>
      ) : isGrouped ? (
        <GroupedUpdates
          updates={filteredUpdates}
          appKey={appKey}
          assignmentMap={assignmentMap}
        />
      ) : (
        <CardList>
          {filteredUpdates.map((update) => (
            <UpdateRow
              key={update.id}
              update={update}
              appKey={appKey}
              channels={assignmentMap.get(update.id) ?? []}
            />
          ))}
        </CardList>
      )}
    </div>
  );
}

function UpdateRow({
  update,
  appKey,
  channels,
}: {
  update: { id: string; platform: string; runtimeVersion: string; bundleHash: string; bundleSize: number | null; enabled: number; createdAt: number };
  appKey: string;
  channels: string[];
}) {
  return (
    <Link
      href={`/dashboard/apps/${appKey}/updates/${update.id}`}
      className="flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors"
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            update.enabled
              ? "bg-success shadow-[0_0_6px_rgba(16,185,129,0.5)]"
              : "bg-error"
          }`}
        />
        <div>
          <p className="text-sm font-mono">
            {update.id.slice(0, 8)}...
          </p>
          <p className="text-xs text-foreground-2">
            {update.platform} &middot; rv {update.runtimeVersion}
            <span className="text-foreground-3 font-mono ml-1">
              {update.bundleHash.slice(0, 12)}
            </span>
            <span className="text-foreground-3 ml-1">
              &middot; {formatBytes(update.bundleSize)}
            </span>
          </p>
        </div>
      </div>
      <div className="text-right">
        <div className="flex gap-1">
          {channels.map((ch) => (
            <span
              key={ch}
              className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20"
            >
              {ch}
            </span>
          ))}
        </div>
        <p
          className="text-xs text-foreground-3 mt-1"
          title={formatAbsolute(update.createdAt)}
        >
          {timeAgo(update.createdAt)}
        </p>
      </div>
    </Link>
  );
}

function GroupedUpdates({
  updates: updatesList,
  appKey,
  assignmentMap,
}: {
  updates: { id: string; updateGroupId: string; platform: string; runtimeVersion: string; bundleHash: string; bundleSize: number | null; enabled: number; createdAt: number }[];
  appKey: string;
  assignmentMap: Map<string, string[]>;
}) {
  const groups = new Map<string, typeof updatesList>();
  for (const u of updatesList) {
    const list = groups.get(u.updateGroupId) ?? [];
    list.push(u);
    groups.set(u.updateGroupId, list);
  }

  return (
    <div className="space-y-3">
      {[...groups.entries()].map(([groupId, items]) => (
        <Card key={groupId}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-mono text-foreground-2">
              Group {groupId.slice(0, 8)}...
            </p>
            <p className="text-xs text-foreground-3">
              rv {items[0].runtimeVersion}
            </p>
          </div>
          <div className="space-y-1">
            {items.map((update) => (
              <Link
                key={update.id}
                href={`/dashboard/apps/${appKey}/updates/${update.id}`}
                className="flex items-center justify-between px-3 py-2 rounded hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      update.enabled
                        ? "bg-success shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                        : "bg-error"
                    }`}
                  />
                  <span className="text-xs">
                    {update.platform === "ios" ? "iOS" : "Android"}
                  </span>
                  <span className="text-xs text-foreground-3">
                    {formatBytes(update.bundleSize)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {(assignmentMap.get(update.id) ?? []).map((ch) => (
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
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
