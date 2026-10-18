"use client";
import { useMemo, useState, useEffect } from "react";
import { uiFor } from "@/lib/ui-copy";
const normalizeIndex = (s: string) =>
  s
    .normalize("NFC")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/[၀-၉]/g, (c) => String(c.charCodeAt(0) - 0x1040))
    .toLowerCase()
    .trim();
export type LocationOption = {
  id: string;
  label: string;
  parent_id: string | null;
  kind: string;
  canonical_id?: string | null;
  aliases?: string[];
};
export default function LocationPicker({
  locations,
  value,
  onChange,
  lang,
  name = "location",
  label,
  allLabel,
  required = false,
}: {
  locations: LocationOption[];
  value?: string;
  onChange?: (v: string) => void;
  lang: string;
  name?: string;
  label: string;
  allLabel: string;
  required?: boolean;
}) {
  const ui = uiFor(lang),
    [internal, setInternal] = useState(value ?? ""),
    [region, setRegion] = useState(""),
    [search, setSearch] = useState("");
  useEffect(() => {
    setInternal(value ?? "");
  }, [value]);
  const selected = onChange ? (value ?? internal) : internal;
  const rows = useMemo(() => {
    const index = new Map(locations.map((l) => [l.id, l]));
    const inRegion = (l: LocationOption) => {
      if (!region) return true;
      let id: string | null = l.canonical_id ?? l.id;
      const seen = new Set<string>();
      while (id && !seen.has(id)) {
        if (id === region) return true;
        seen.add(id);
        id = index.get(id)?.parent_id ?? null;
      }
      return false;
    };
    const term = normalizeIndex(search);
    const aliased = new Set(
      locations
        .filter((l) => l.canonical_id && l.kind === "TOWNSHIP")
        .map((l) => l.canonical_id),
    );
    return locations
      .filter(
        (l) =>
          !aliased.has(l.id) &&
          (!required || ["CITY", "TOWNSHIP"].includes(l.kind)),
      )
      .filter(
        (l) =>
          (!l.canonical_id &&
            ["REGION", "DISTRICT", "CITY", "TOWNSHIP"].includes(l.kind)) ||
          (l.canonical_id && l.kind === "TOWNSHIP"),
      )
      .filter(
        (l) =>
          inRegion(l) &&
          (!term ||
            normalizeIndex(
              l.label + " " + (l.aliases ?? []).join(" "),
            ).includes(term)),
      );
  }, [locations, region, search, required]);
  const current = locations.find((l) => l.id === selected);
  return (
    <div className="location-picker stack">
      <div className="two-columns">
        <label>
          {ui("State / region")}
          <select
            aria-label={ui("State / region")}
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setSearch("");
              setInternal(required ? "" : e.target.value);
              onChange?.("");
            }}
          >
            <option value="">{ui("All states and regions")}</option>
            {locations
              .filter((l) => l.kind === "REGION" && !l.canonical_id)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
          </select>
        </label>
        <label>
          {ui("Search townships")}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={100}
          />
        </label>
      </div>
      <label>
        {label}
        <select
          name={name}
          required={required}
          value={selected}
          onChange={(e) => {
            setInternal(e.target.value);
            onChange?.(e.target.value);
          }}
          aria-label={label}
        >
          <option value="">{allLabel}</option>
          {current && !rows.some((l) => l.id === current.id) && (
            <option value={current.id}>{current.label}</option>
          )}
          {rows.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
