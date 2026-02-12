import { db } from "@/lib/db";
import { apps, updates, assets, channelAssignments, channels } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RollbackButton } from "./rollback-button";
import { PromoteButton } from "./promote-button";

export default async function UpdateDetailPage({
  params,
}: {
  params: Promise<{ appKey: string; id: string }>;
}) {
  const { appKey, id } = await params;

  const app = db.select().from(apps).where(eq(apps.appKey, appKey)).get();
  if (!app) notFound();

  const update = db
    .select()
    .from(updates)
    .where(and(eq(updates.id, id), eq(updates.appId, app.id)))
    .get();
  if (!update) notFound();

  const assetList = db
    .select()
    .from(assets)
    .where(eq(assets.updateId, update.id))
    .all();

  const channelList = db
    .select()
    .from(channels)
    .where(eq(channels.appId, app.id))
    .all();

  const assignedChannels: string[] = [];
  for (const ch of channelList) {
    const assignment = db
      .select()
      .from(channelAssignments)
      .where(
        and(
          eq(channelAssignments.channelId, ch.id),
          eq(channelAssignments.updateId, update.id)
        )
      )
      .get();
    if (assignment) assignedChannels.push(ch.name);
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/apps/${appKey}`}
          className="text-sm text-foreground/50 hover:text-foreground"
        >
          &larr; {app.name}
        </Link>
        <h1 className="text-2xl font-bold mt-2">Update Detail</h1>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="border border-foreground/10 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-foreground/50 mb-3 uppercase tracking-wider">
            Info
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="ID" value={update.id} mono />
            <Row label="Group ID" value={update.updateGroupId} mono />
            <Row label="Platform" value={update.platform} />
            <Row label="Runtime Version" value={update.runtimeVersion} />
            <Row
              label="Status"
              value={update.enabled ? "Enabled" : "Disabled"}
            />
            <Row
              label="Bundle Size"
              value={
                update.bundleSize
                  ? `${(update.bundleSize / 1024).toFixed(1)} KB`
                  : "N/A"
              }
            />
            <Row
              label="Created"
              value={new Date(update.createdAt).toLocaleString()}
            />
            <Row
              label="Channels"
              value={
                assignedChannels.length > 0
                  ? assignedChannels.join(", ")
                  : "None"
              }
            />
          </dl>
        </div>

        <div className="border border-foreground/10 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-foreground/50 mb-3 uppercase tracking-wider">
            Actions
          </h2>
          <div className="space-y-3">
            <RollbackButton
              appKey={appKey}
              updateId={update.id}
              channels={channelList.map((c) => c.name)}
            />
            <PromoteButton
              appKey={appKey}
              updateId={update.id}
              channels={channelList.map((c) => c.name)}
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3">
          Assets ({assetList.length})
        </h2>
        {assetList.length === 0 ? (
          <p className="text-foreground/50 text-sm">No assets.</p>
        ) : (
          <div className="border border-foreground/10 rounded-lg divide-y divide-foreground/10">
            {assetList.map((asset) => (
              <div key={asset.id} className="p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs">{asset.key}</span>
                  <span className="text-foreground/50 text-xs">
                    {asset.fileExtension} &middot;{" "}
                    {asset.size
                      ? `${(asset.size / 1024).toFixed(1)} KB`
                      : "N/A"}
                  </span>
                </div>
                <p className="text-xs text-foreground/40 mt-0.5 font-mono truncate">
                  {asset.hash}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Manifest Preview</h2>
        <pre className="bg-foreground/5 rounded-lg p-4 text-xs overflow-auto max-h-80 font-mono">
          {JSON.stringify(
            {
              id: update.id,
              createdAt: new Date(update.createdAt).toISOString(),
              runtimeVersion: update.runtimeVersion,
              launchAsset: {
                hash: update.bundleHash,
                key: "bundle",
                fileExtension: ".bundle",
                contentType: "application/javascript",
                url: `<presigned-url for ${update.bundleS3Key}>`,
              },
              assets: assetList.map((a) => ({
                hash: a.hash,
                key: a.key,
                fileExtension: a.fileExtension,
                contentType: a.contentType,
                url: `<presigned-url for ${a.s3Key}>`,
              })),
              metadata: { branchName: assignedChannels[0] ?? "unknown" },
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-foreground/50">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : ""}>{value}</dd>
    </div>
  );
}
