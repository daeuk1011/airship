import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/libs/db";
import { apps } from "@/shared/libs/db/schema";
import { eq } from "drizzle-orm";
import { verifyAuth } from "@/shared/libs/auth";
import { getPresignedUploadUrl } from "@/shared/libs/s3";
import { errorResponse, invalidRequestFromZod } from "@/shared/libs/http/error";
import { presignUploadSchema } from "@/shared/validation/uploads";
import { v4 as uuidv4 } from "uuid";

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
  const parsed = presignUploadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return invalidRequestFromZod(parsed.error);
  }

  const { runtimeVersion, platform, bundleFilename, assets: assetList } = parsed.data;

  const updateGroupId = uuidv4();
  const prefix = `ota/${appKey}/${runtimeVersion}/${updateGroupId}`;

  const bundleS3Key = `${prefix}/bundles/${platform}/${bundleFilename}`;
  const bundlePresignedUrl = await getPresignedUploadUrl(
    bundleS3Key,
    "application/javascript"
  );

  const presignedAssets = await Promise.all(
    assetList.map(async (asset) => {
      const s3Key = `${prefix}/assets/${asset.filename}`;
      const presignedUrl = await getPresignedUploadUrl(
        s3Key,
        asset.contentType
      );
      return {
        filename: asset.filename,
        s3Key,
        presignedUrl,
      };
    })
  );

  return NextResponse.json({
    updateGroupId,
    bundle: {
      s3Key: bundleS3Key,
      presignedUrl: bundlePresignedUrl,
    },
    assets: presignedAssets,
  });
}
