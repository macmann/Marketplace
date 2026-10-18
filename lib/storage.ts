import {
  mkdir,
  writeFile,
  readFile,
  unlink,
  readdir,
  stat,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
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
const valid = (key: string) =>
  /^[a-f0-9-]{36}(?:\.webp|\.source|\.(?:preview|thumb|card)\.webp)$/.test(key);
export function imageKeys(key: string) {
  if (!/^[a-f0-9-]{36}\.webp$/.test(key)) throw Error("Invalid key");
  const root = key.slice(0, -5);
  return {
    original: key,
    source: root + ".source",
    preview: root + ".preview.webp",
    thumb: root + ".thumb.webp",
    card: root + ".card.webp",
  };
}
export async function putObject(key: string, buffer: Buffer) {
  if (!valid(key)) throw Error("Invalid key");
  if (process.env.S3_BUCKET)
    await s3().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: key.endsWith(".source")
          ? "application/octet-stream"
          : "image/webp",
        CacheControl: "private, no-store",
      }),
    );
  else {
    await mkdir(dir(), { recursive: true });
    await writeFile(path.join(dir(), key), buffer);
  }
}
export async function readObject(key: string) {
  if (!valid(key)) throw Error("Invalid key");
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
export async function removeObject(key: string) {
  if (!valid(key)) throw Error("Invalid key");
  if (process.env.S3_BUCKET)
    await s3().send(
      new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
  else
    await unlink(path.join(/* turbopackIgnore: true */ dir(), key)).catch(
      (e: NodeJS.ErrnoException) => {
        if (e.code !== "ENOENT") throw e;
      },
    );
}
export async function saveImage(file: File) {
  if (
    file.size === 0 ||
    file.size > 8 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)
  )
    throw Error("Invalid image");
  const input = Buffer.from(await file.arrayBuffer());
  const image = sharp(input, {
    limitInputPixels: 40_000_000,
    failOn: "warning",
    animated: false,
  });
  const meta = await image.metadata();
  if (
    !["jpeg", "png", "webp", "avif", "heif"].includes(meta.format ?? "") ||
    !meta.width ||
    !meta.height ||
    meta.width * meta.height > 40_000_000 ||
    (meta.pages ?? 1) > 1
  )
    throw Error("Invalid image");
  // Only a small, metadata-free preview is made in the request; full variants and analysis run in the worker.
  const preview = await image
    .rotate()
    .resize(320, 320, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 76 })
    .toBuffer();
  const key = randomUUID() + ".webp",
    keys = imageKeys(key);
  try {
    await putObject(keys.source, input);
    await putObject(keys.preview, preview);
  } catch (e) {
    await deleteImage(key).catch(() => {});
    throw e;
  }
  return key;
}
export async function getImage(
  key: string,
  variant: "original" | "thumb" | "card" | "preview" = "original",
) {
  const keys = imageKeys(key);
  try {
    return await readObject(keys[variant]);
  } catch (e) {
    if (variant === "preview") throw e;
    if (variant === "original") return readObject(keys.preview);
    return getImage(key, "original");
  }
}
export async function deleteImage(key: string) {
  await Promise.all(Object.values(imageKeys(key)).map(removeObject));
}
export async function listStoredObjects(
  cursor: string,
  limit = 250,
): Promise<{ objects: { key: string; modified: Date }[]; cursor: string }> {
  if (process.env.S3_BUCKET) {
    const r = await s3().send(
      new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET,
        StartAfter: cursor || undefined,
        MaxKeys: limit,
      }),
    );
    const rows = (r.Contents ?? [])
      .filter((x) => x.Key && valid(x.Key))
      .map((x) => ({ key: x.Key!, modified: x.LastModified ?? new Date() }));
    return {
      objects: rows,
      cursor: r.IsTruncated ? (r.Contents?.at(-1)?.Key ?? "") : "",
    };
  }
  let names: string[];
  try {
    names = await readdir(/* turbopackIgnore: true */ dir());
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT")
      return { objects: [], cursor: "" };
    throw e;
  }
  const all = names.filter((k) => valid(k) && k > cursor).sort(),
    batch = all.slice(0, limit);
  const found = await Promise.all(
    batch.map(async (key) => {
      try {
        return {
          key,
          modified: (
            await stat(/* turbopackIgnore: true */ path.join(dir(), key))
          ).mtime,
        };
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw e;
      }
    }),
  );
  const objects = found.filter(
    (x): x is { key: string; modified: Date } => x !== null,
  );
  return { objects, cursor: all.length > limit ? batch.at(-1)! : "" };
}
