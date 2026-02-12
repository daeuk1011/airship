import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "ap-northeast-2",
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

function getBucket(): string {
  return process.env.AWS_S3_BUCKET ?? "my-ota-bucket";
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresIn?: number
): Promise<string> {
  const expiry = expiresIn ?? Number(process.env.PRESIGNED_URL_EXPIRY ?? 600);
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: expiry });
}

export async function getPresignedUploadUrl(
  key: string,
  contentType?: string,
  expiresIn?: number
): Promise<string> {
  const expiry = expiresIn ?? Number(process.env.UPLOAD_URL_EXPIRY ?? 900);
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ...(contentType ? { ContentType: contentType } : {}),
  });
  return getSignedUrl(s3Client, command, { expiresIn: expiry });
}

export async function headObject(key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({ Bucket: getBucket(), Key: key })
    );
    return true;
  } catch {
    return false;
  }
}
