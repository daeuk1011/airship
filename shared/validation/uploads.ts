import { z } from "zod";

const nonEmpty = z.string().trim().min(1);
const platform = z.enum(["ios", "android"]);
const noPathTraversal = (value: string) =>
  !value.includes("..") &&
  !value.includes("\\") &&
  !value.startsWith("/") &&
  !value.startsWith("./") &&
  !value.startsWith("../");

const safeFilename = nonEmpty.refine(
  (value) => noPathTraversal(value) && !value.includes("/"),
  {
    message: "Filename must not contain path separators",
  }
);

const s3Key = nonEmpty.refine(noPathTraversal, {
  message: "Invalid S3 key",
});

const sha256Hex = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{64}$/, "Hash must be a SHA-256 hex string")
  .transform((value) => value.toLowerCase());

export const presignAssetSchema = z.object({
  filename: safeFilename,
  contentType: nonEmpty.optional(),
});

export const presignUploadSchema = z.object({
  runtimeVersion: nonEmpty,
  platform,
  bundleFilename: safeFilename,
  assets: z.array(presignAssetSchema).default([]),
});

export const commitBundleSchema = z.object({
  s3Key,
  hash: sha256Hex,
  size: z.number().finite().min(0).optional(),
});

export const commitAssetSchema = z.object({
  s3Key,
  hash: sha256Hex,
  key: nonEmpty,
  fileExtension: nonEmpty,
  contentType: nonEmpty.optional(),
  size: z.number().finite().min(0).optional(),
});

export const commitUploadSchema = z.object({
  updateGroupId: z.string().uuid(),
  runtimeVersion: nonEmpty,
  platform,
  channelName: nonEmpty.optional(),
  bundle: commitBundleSchema,
  assets: z.array(commitAssetSchema).default([]),
});

export const uploadPreflightSchema = z.object({
  platform,
  runtimeVersion: nonEmpty.optional(),
  channelName: nonEmpty.optional(),
  bundleFilename: safeFilename.optional(),
  bundleSize: z.number().finite().min(0).optional(),
});

export type PresignUploadInput = z.infer<typeof presignUploadSchema>;
export type CommitUploadInput = z.infer<typeof commitUploadSchema>;
export type UploadPreflightInput = z.infer<typeof uploadPreflightSchema>;
