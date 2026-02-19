import { db } from "@/shared/libs/db";
import { apps, updates, assets, channelAssignments, channels } from "@/shared/libs/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/shared/ui/breadcrumb";
import { Card } from "@/shared/ui/card";
import { CardList } from "@/shared/ui/card";
import { RollbackButton } from "@/features/updates/components/rollback-button";
import { PromoteButton } from "@/features/updates/components/promote-button";
import { ToggleUpdateButton } from "@/features/updates/components/toggle-update-button";
import { CopyButton } from "@/shared/ui/copy-button";
import { timeAgo, formatAbsolute } from "@/shared/utils/time";
import { formatBytes } from "@/shared/utils/format";

export const dynamic = "force-dynamic";

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

  const manifestJson = JSON.stringify(
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
  );

  const manifestLines = manifestJson.split("\n");

  return (
    <div className="p-8">
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: "Apps", href: "/dashboard/apps" },
            { label: app.name, href: `/dashboard/apps/${appKey}` },
            { label: `Update ${id.slice(0, 8)}...` },
          ]}
        />
        <h1 className="text-2xl font-bold mt-2">Update Detail</h1>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xs font-semibold text-foreground-2 mb-3 uppercase tracking-wider">
            Info
          </h2>
          <dl className="space-y-2 text-sm">
            <CopyRow label="ID" value={update.id} mono />
            <CopyRow label="Group ID" value={update.updateGroupId} mono />
            <Row label="Platform" value={update.platform} />
            <Row label="Runtime Version" value={update.runtimeVersion} />
            <Row
              label="Status"
              value={update.enabled ? "Enabled" : "Disabled"}
            />
            <CopyRow label="Bundle Hash" value={update.bundleHash} mono />
            <Row
              label="Bundle Size"
              value={formatBytes(update.bundleSize)}
            />
            {update.commitHash && (
              <CopyRow
                label="Commit"
                value={update.commitHash}
                display={update.commitHash.slice(0, 8)}
                mono
              />
            )}
            {update.commitMessage && (
              <Row label="Commit Message" value={update.commitMessage} />
            )}
            <div className="flex justify-between">
              <dt className="text-foreground-2">Created</dt>
              <dd title={formatAbsolute(update.createdAt)}>
                {timeAgo(update.createdAt)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-foreground-2">Channels</dt>
              <dd className="flex gap-1.5 flex-wrap justify-end">
                {assignedChannels.length > 0 ? (
                  assignedChannels.map((ch) => (
                    <span
                      key={ch}
                      className="inline-flex items-center rounded-full bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 text-xs font-medium"
                    >
                      {ch}
                    </span>
                  ))
                ) : (
                  <span className="text-foreground-3 text-xs">None</span>
                )}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="text-xs font-semibold text-foreground-2 mb-3 uppercase tracking-wider">
            Actions
          </h2>
          <div className="space-y-3">
            <ToggleUpdateButton
              appKey={appKey}
              updateId={update.id}
              enabled={!!update.enabled}
            />
            <RollbackButton
              appKey={appKey}
              updateId={update.id}
              channels={channelList.map((c) => c.name)}
            />
            <PromoteButton
              appKey={appKey}
              updateId={update.id}
              channels={channelList.map((c) => c.name)}
              assignedChannels={assignedChannels}
            />
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3">
          Assets ({assetList.length})
        </h2>
        {assetList.length === 0 ? (
          <p className="text-foreground-2 text-sm">No assets.</p>
        ) : (
          <CardList>
            {assetList.map((asset) => (
              <div key={asset.id} className="p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs">{asset.key}</span>
                  <span className="text-foreground-2 text-xs">
                    {asset.fileExtension} &middot;{" "}
                    {asset.size
                      ? `${(asset.size / 1024).toFixed(1)} KB`
                      : "N/A"}
                  </span>
                </div>
                <p className="text-xs text-foreground-3 mt-0.5 font-mono truncate">
                  {asset.hash}
                </p>
              </div>
            ))}
          </CardList>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Manifest Preview</h2>
        <pre className="bg-[#0d1117] border border-white/[0.06] rounded-lg p-4 text-xs overflow-auto max-h-80 font-mono">
          {manifestLines.map((line, i) => (
            <div key={i} className="flex">
              <span className="inline-block w-8 text-right mr-4 text-foreground-3 select-none">
                {i + 1}
              </span>
              <span>{line}</span>
            </div>
          ))}
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
      <dt className="text-foreground-2">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : ""}>{value}</dd>
    </div>
  );
}

function CopyRow({
  label,
  value,
  display,
  mono,
}: {
  label: string;
  value: string;
  display?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <dt className="text-foreground-2">{label}</dt>
      <dd className="flex items-center gap-1">
        <span className={mono ? "font-mono text-xs truncate max-w-48" : ""}>
          {display ?? value}
        </span>
        <CopyButton text={value} />
      </dd>
    </div>
  );
}
