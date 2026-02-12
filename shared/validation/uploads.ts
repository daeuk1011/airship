import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

export const presignAssetSchema = z.object({
  filename: nonEmpty,
  contentType: nonEmpty.optional(),
});

export const presignUploadSchema = z.object({
  runtimeVersion: nonEmpty,
  platform: nonEmpty,
  bundleFilename: nonEmpty,
  assets: z.array(presignAssetSchema).default([]),
});

export const commitBundleSchema = z.object({
  s3Key: nonEmpty,
  hash: nonEmpty,
  size: z.number().finite().min(0).optional(),
});

export const commitAssetSchema = z.object({
  s3Key: nonEmpty,
  hash: nonEmpty,
  key: nonEmpty,
  fileExtension: nonEmpty,
  contentType: nonEmpty.optional(),
  size: z.number().finite().min(0).optional(),
});

export const commitUploadSchema = z.object({
  updateGroupId: nonEmpty,
  runtimeVersion: nonEmpty,
  platform: nonEmpty,
  channelName: nonEmpty.optional(),
  bundle: commitBundleSchema,
  assets: z.array(commitAssetSchema).default([]),
});

export type PresignUploadInput = z.infer<typeof presignUploadSchema>;
export type CommitUploadInput = z.infer<typeof commitUploadSchema>;
