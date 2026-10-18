import sharp from "sharp";
import { createHash } from "node:crypto";
export async function imageVariants(input: Buffer) {
  const options = {
    limitInputPixels: 40_000_000,
    failOn: "warning" as const,
    animated: false,
  };
  const base = sharp(input, options).rotate();
  const { data, info } = await base
    .clone()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const [thumb, card, pixels] = await Promise.all([
    base
      .clone()
      .resize(320, 320, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 76 })
      .toBuffer(),
    base
      .clone()
      .resize(640, 640, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer(),
    base
      .clone()
      .flatten({ background: "#ffffff" })
      .resize(9, 8, { fit: "fill" })
      .greyscale()
      .raw()
      .toBuffer(),
  ]);
  let hash = 0n;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      hash =
        (hash << 1n) | (pixels[y * 9 + x] > pixels[y * 9 + x + 1] ? 1n : 0n);
  const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
  const variance =
    pixels.reduce((a, b) => a + (b - mean) ** 2, 0) / pixels.length;
  return {
    original: data,
    thumb,
    card,
    width: info.width,
    height: info.height,
    sha256: createHash("sha256").update(data).digest("hex"),
    perceptualHash: variance >= 64 ? hash.toString(16).padStart(16, "0") : null,
  };
}
export function hashDistance(a: string, b: string) {
  if (!/^[a-f0-9]{16}$/.test(a) || !/^[a-f0-9]{16}$/.test(b)) return 64;
  let n = BigInt("0x" + a) ^ BigInt("0x" + b),
    count = 0;
  while (n) {
    count++;
    n &= n - 1n;
  }
  return count;
}
