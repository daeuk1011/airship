import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/libs/db";
import { apps, channels, updates, channelAssignments } from "@/shared/libs/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { verifyAuth } from "@/shared/libs/auth";
import { errorResponse, invalidRequestFromZod } from "@/shared/libs/http/error";
import { uploadPreflightSchema } from "@/shared/validation/uploads";

type CheckStatus = "pass" | "warn" | "fail";
type PreflightCheck = {
  id: string;
  status: CheckStatus;
  message: string;
};

const VALID_BUNDLE_EXTENSIONS = new Set([".js", ".bundle", ".hbc"]);
const LARGE_BUNDLE_BYTES = 20 * 1024 * 1024;

function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx < 0) return "";
  return filename.slice(idx).toLowerCase();
}

function chooseDefaultChannel(channelNames: string[]): string {
  if (channelNames.includes("staging")) return "staging";
  if (channelNames.includes("production")) return "production";
  return channelNames[0] ?? "staging";
}

function sortVersionsDesc(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true })
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appKey: string }> }
) {
  const authError = verifyAuth(request);
  if (authError) return authError;

  const { appKey } = await params;

  const app = db.select().from(apps).where(eq(apps.appKey, appKey)).get();
  if (!app) {
    return errorResponse(404, "NOT_FOUND", "App not found");
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = uploadPreflightSchema.safeParse(rawBody);
  if (!parsed.success) {
    return invalidRequestFromZod(parsed.error);
  }

  const {
    platform,
    runtimeVersion,
    channelName,
    bundleFilename,
    bundleSize,
  } = parsed.data;

  const appChannels = db
    .select()
    .from(channels)
    .where(eq(channels.appId, app.id))
    .all();
  const channelNames = appChannels.map((c) => c.name);

  const appUpdates = db
    .select({
      id: updates.id,
      runtimeVersion: updates.runtimeVersion,
      platform: updates.platform,
      createdAt: updates.createdAt,
    })
    .from(updates)
    .where(eq(updates.appId, app.id))
    .orderBy(desc(updates.createdAt))
    .all();

  const platformUpdates = appUpdates.filter((u) => u.platform === platform);
  const knownRuntimeVersions = sortVersionsDesc(
    platformUpdates.map((u) => u.runtimeVersion)
  );

  const latestPlatformUpdate = platformUpdates[0];
  const latestAnyUpdate = appUpdates[0];

  const suggestedRuntimeVersion =
    latestPlatformUpdate?.runtimeVersion ??
    latestAnyUpdate?.runtimeVersion ??
    "1.0.0";
  const suggestedChannelName = chooseDefaultChannel(channelNames);

  const checks: PreflightCheck[] = [];
  const hasValidationIntent =
    runtimeVersion !== undefined ||
    channelName !== undefined ||
    bundleFilename !== undefined ||
    bundleSize !== undefined;

  if (hasValidationIntent) {
    if (!runtimeVersion) {
      checks.push({
        id: "runtime-required",
        status: "fail",
        message: "Runtime version is required.",
      });
    } else if (knownRuntimeVersions.includes(runtimeVersion)) {
      checks.push({
        id: "runtime-known",
        status: "pass",
        message: `Runtime ${runtimeVersion} is already used for ${platform}.`,
      });
    } else {
      checks.push({
        id: "runtime-new",
        status: "warn",
        message: `Runtime ${runtimeVersion} is new for ${platform}. Only clients on this runtime will receive it.`,
      });
    }

    let selectedChannel = null;
    if (!channelName) {
      checks.push({
        id: "channel-required",
        status: "fail",
        message: "Channel is required.",
      });
    } else {
      selectedChannel = appChannels.find((c) => c.name === channelName) ?? null;
      if (selectedChannel) {
        checks.push({
          id: "channel-existing",
          status: "pass",
          message: `Channel '${channelName}' exists.`,
        });
      } else {
        checks.push({
          id: "channel-new",
          status: "warn",
          message: `Channel '${channelName}' does not exist and will be created on commit.`,
        });
      }
    }

    if (runtimeVersion && selectedChannel) {
      const existingAssignment = db
        .select({
          id: channelAssignments.id,
          updateId: channelAssignments.updateId,
        })
        .from(channelAssignments)
        .where(
          and(
            eq(channelAssignments.appId, app.id),
            eq(channelAssignments.channelId, selectedChannel.id),
            eq(channelAssignments.runtimeVersion, runtimeVersion),
            eq(channelAssignments.platform, platform)
          )
        )
        .get();

      if (existingAssignment) {
        checks.push({
          id: "assignment-replace",
          status: "warn",
          message: `Existing assignment ${existingAssignment.updateId.slice(0, 8)}... will be replaced.`,
        });
      } else {
        checks.push({
          id: "assignment-new",
          status: "pass",
          message: "No existing assignment for this channel/runtime/platform.",
        });
      }
    }

    if (!bundleFilename) {
      checks.push({
        id: "bundle-required",
        status: "fail",
        message: "Bundle file is required.",
      });
    } else {
      const extension = getFileExtension(bundleFilename);
      if (VALID_BUNDLE_EXTENSIONS.has(extension)) {
        checks.push({
          id: "bundle-extension-ok",
          status: "pass",
          message: `Bundle extension ${extension} looks valid.`,
        });
      } else {
        checks.push({
          id: "bundle-extension-warn",
          status: "warn",
          message: `Bundle extension '${extension || "(none)"}' is unusual. Recommended: .js, .bundle, .hbc.`,
        });
      }
    }

    if (bundleSize === undefined) {
      checks.push({
        id: "bundle-size-required",
        status: "fail",
        message: "Bundle size is required.",
      });
    } else if (bundleSize === 0) {
      checks.push({
        id: "bundle-size-empty",
        status: "fail",
        message: "Bundle file is empty.",
      });
    } else if (bundleSize > LARGE_BUNDLE_BYTES) {
      checks.push({
        id: "bundle-size-large",
        status: "warn",
        message: `Bundle is larger than ${Math.floor(
          LARGE_BUNDLE_BYTES / (1024 * 1024)
        )}MB. Consider splitting to reduce OTA risk.`,
      });
    } else {
      checks.push({
        id: "bundle-size-ok",
        status: "pass",
        message: "Bundle size looks reasonable.",
      });
    }
  }

  const ok = checks.every((check) => check.status !== "fail");

  return NextResponse.json({
    ok,
    suggested: {
      platform,
      runtimeVersion: suggestedRuntimeVersion,
      channelName: suggestedChannelName,
    },
    availableChannels: channelNames,
    knownRuntimeVersions,
    checks,
  });
}
