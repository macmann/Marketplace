import { readFile } from "node:fs/promises";
import { query } from "../lib/db";
import { normalizeIndex } from "../lib/myanmar-text";
export async function seedMyanmar() {
  const data = JSON.parse(
    await readFile(
      new URL("../data/myanmar-locations.json", import.meta.url),
      "utf8",
    ),
  ) as {
    source_version: string;
    locations: {
      id: string;
      parent_id: string;
      name_en: string;
      name_my: string;
      kind: string;
      latitude?: number;
      longitude?: number;
      aliases: string[];
    }[];
    legacy_aliases: { id: string; canonical_id: string }[];
  };
  // Regions precede districts; all districts precede their township descendants in the vendored snapshot.
  for (const kind of ["REGION", "DISTRICT", "TOWNSHIP"])
    for (const l of data.locations.filter((l) => l.kind === kind))
      await query(
        "INSERT INTO locations(id,parent_id,name_en,name_my,kind,latitude,longitude,aliases,source_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) ON CONFLICT(id) DO UPDATE SET latitude=COALESCE(locations.latitude,excluded.latitude),longitude=COALESCE(locations.longitude,excluded.longitude),source_version=COALESCE(locations.source_version,excluded.source_version)",
        [
          l.id,
          l.parent_id,
          l.name_en,
          l.name_my,
          l.kind,
          l.latitude ?? null,
          l.longitude ?? null,
          JSON.stringify(l.aliases),
          data.source_version,
        ],
      );
  for (const alias of data.legacy_aliases)
    await query(
      "UPDATE locations SET canonical_id=$1 WHERE id=$2 AND canonical_id IS NULL",
      [alias.canonical_id, alias.id],
    );
  for (;;) {
    const rows = await query(
      "SELECT id,title,description FROM listings WHERE search_title IS NULL LIMIT 200",
    );
    if (!rows.length) break;
    for (const l of rows)
      await query(
        "UPDATE listings SET search_title=$1,search_text=$2 WHERE id=$3 AND search_title IS NULL",
        [
          normalizeIndex(l.title),
          normalizeIndex(l.title + " " + l.description),
          l.id,
        ],
      );
  }
}
