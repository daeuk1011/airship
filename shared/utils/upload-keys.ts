export function buildUploadPrefix(
  appKey: string,
  runtimeVersion: string,
  updateGroupId: string
): string {
  return `ota/${appKey}/${runtimeVersion}/${updateGroupId}`;
}

export function buildBundleS3Key(
  prefix: string,
  platform: string,
  bundleFilename: string
): string {
  return `${prefix}/bundles/${platform}/${bundleFilename}`;
}

export function buildAssetS3Key(prefix: string, filename: string): string {
  return `${prefix}/assets/${filename}`;
}

export function isBundleS3KeyInScope(
  key: string,
  prefix: string,
  platform: string
): boolean {
  const expectedPrefix = `${prefix}/bundles/${platform}/`;
  return key.startsWith(expectedPrefix) && key.length > expectedPrefix.length;
}

export function isAssetS3KeyInScope(key: string, prefix: string): boolean {
  const expectedPrefix = `${prefix}/assets/`;
  return key.startsWith(expectedPrefix) && key.length > expectedPrefix.length;
}
