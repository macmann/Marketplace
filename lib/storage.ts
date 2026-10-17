import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
const dir = () => process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
const s3 = () =>
  new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || "auto",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
export async function saveImage(file: File) {
  if (
    file.size > 8 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)
  )
    throw new Error("Use JPEG, PNG, WebP or AVIF images under 8 MB.");
  const input = Buffer.from(await file.arrayBuffer());
  const image = sharp(input, { limitInputPixels: 40_000_000 });
  const meta = await image.metadata();
  if (!["jpeg", "png", "webp", "avif", "heif"].includes(meta.format ?? ""))
    throw new Error("Invalid image");
  const buffer = await image
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const key = randomUUID() + ".webp";
  if (process.env.S3_BUCKET)
    await s3().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: "image/webp",
      }),
    );
  else {
    await mkdir(dir(), { recursive: true });
    await writeFile(path.join(dir(), key), buffer);
  }
  return key;
}
export async function getImage(key: string) {
  if (!/^[a-f0-9-]{36}\.webp$/.test(key)) throw new Error("Invalid key");
  if (process.env.S3_BUCKET) {
    const r = await s3().send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
    return Buffer.from(await r.Body!.transformToByteArray());
  }
  return readFile(
    /* turbopackIgnore: true */ path.join(
      /* turbopackIgnore: true */ dir(),
      key,
    ),
  );
}
export async function deleteImage(key: string) {
  if (!/^[a-f0-9-]{36}\.webp$/.test(key))
    throw new Error("Invalid storage key");
  if (process.env.S3_BUCKET)
    await s3().send(
      new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
  else
    await unlink(path.join(/* turbopackIgnore: true */ dir(), key)).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      },
    );
}
