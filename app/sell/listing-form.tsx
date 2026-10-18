"use client";
import LocationPicker, { type LocationOption } from "@/app/location-picker";
import { useActionState, useState, useEffect, useRef, useMemo } from "react";
import { saveListing, type EditorResult } from "./actions";
import {
  emptyPayload,
  type ListingPayload,
  type Attribute,
} from "@/lib/listing-validation";
import type { en } from "@/lib/i18n";
import type { listingCopy } from "@/lib/listing-i18n";
type Photo = { id: string; url: string; file?: File };
export default function ListingForm({
  t,
  a,
  lang,
  categories,
  locations,
  conditions,
  definitions,
  initial = emptyPayload,
  images = [],
  kind = "draft",
  id = "",
  revision = 0,
}: {
  t: typeof en;
  a: Awaited<ReturnType<typeof listingCopy>>;
  lang: string;
  categories: { id: string; label: string; parent_id: string | null }[];
  locations: LocationOption[];
  conditions: { id: string; label: string }[];
  definitions: Attribute[];
  initial?: ListingPayload;
  images?: { id: string; storage_key: string }[];
  kind?: "draft" | "listing";
  id?: string;
  revision?: number;
}) {
  const [state, action, pending] = useActionState<EditorResult, FormData>(
    saveListing,
    {},
  );
  const [payload, setPayload] = useState(initial);
  const [photos, setPhotos] = useState<Photo[]>(
    images.map((i) => ({ id: i.id, url: "/media/" + i.storage_key })),
  );
  const [error, setError] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const previews = useRef(new Set<string>());
  useEffect(
    () => () => {
      for (const url of previews.current) URL.revokeObjectURL(url);
    },
    [],
  );
  const applicable = useMemo(() => {
    const ancestors = new Set<string>();
    let category: string | null = payload.category;
    while (category && !ancestors.has(category)) {
      ancestors.add(category);
      category = categories.find((c) => c.id === category)?.parent_id ?? null;
    }
    return definitions.filter((d) => ancestors.has(d.category_id));
  }, [payload.category, categories, definitions]);
  const field = (key: keyof ListingPayload, value: string) =>
    setPayload((p) => ({ ...p, [key]: value }));
  function addFiles(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    if (photos.length + selected.length > 10) {
      setError(a.photoCount);
      return;
    }
    if (
      selected.some(
        (f) =>
          f.size > 8 * 1024 * 1024 ||
          !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
            f.type,
          ),
      )
    ) {
      setError(a.uploadFailed);
      return;
    }
    const next = selected.map((file) => {
      const url = URL.createObjectURL(file);
      previews.current.add(url);
      return { id: crypto.randomUUID(), url, file };
    });
    setPhotos((p) => [...p, ...next]);
    setError("");
  }
  function move(index: number, offset: number) {
    setPhotos((p) => {
      const next = [...p];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
  }
  function removePhoto(photo: Photo) {
    if (photo.file) {
      URL.revokeObjectURL(photo.url);
      previews.current.delete(photo.url);
    }
    setPhotos((all) => all.filter((p) => p.id !== photo.id));
  }
  return (
    <form
      ref={form}
      className="stack panel listing-form"
      action={(data) => {
        const mode = String(data.get("mode"));
        if (mode === "publish" && !form.current?.reportValidity()) return;
        const uploads = photos.filter((p) => p.file);
        if (uploads.reduce((n, p) => n + p.file!.size, 0) > 24 * 1024 * 1024) {
          setError(a.photoHelp);
          return;
        }
        data.set(
          "payload",
          JSON.stringify({
            ...payload,
            attributes: Object.fromEntries(
              applicable.map((d) => [d.id, payload.attributes[d.id] ?? ""]),
            ),
          }),
        );
        data.set(
          "photoOrder",
          JSON.stringify(
            photos.map((p) => (p.file ? "new:" + uploads.indexOf(p) : p.id)),
          ),
        );
        data.delete("photos");
        for (const p of uploads) data.append("photos", p.file!);
        setError("");
        action(data);
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="revision" value={revision} />
      {(state.error || error) && (
        <p role="alert" className="notice error">
          {error || state.error}
        </p>
      )}
      <fieldset disabled={pending}>
        <legend>{a.photos}</legend>
        <p className="muted">{a.photoHelp}</p>
        <div className="editor-photos">
          {photos.map((p, i) => (
            <div className="editor-photo" key={p.id}>
              <img
                src={p.url}
                alt={a.photos + " " + (i + 1)}
                width={160}
                height={130}
              />
              {i === 0 && <small>{a.cover}</small>}
              <div>
                <button
                  type="button"
                  aria-label={a.earlier + " " + (i + 1)}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label={a.later + " " + (i + 1)}
                  disabled={i === photos.length - 1}
                  onClick={() => move(i, 1)}
                >
                  →
                </button>
                <button
                  type="button"
                  aria-label={a.remove + " " + (i + 1)}
                  onClick={() => removePhoto(p)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        <label className="upload-zone">
          <strong>{t.photos}</strong>
          <input
            aria-label={t.photos}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </fieldset>
      <label>
        {t.title}
        <input
          name="title"
          value={payload.title}
          onChange={(e) => field("title", e.target.value)}
          minLength={3}
          maxLength={120}
          required
        />
      </label>
      <label>
        {t.description}
        <textarea
          name="description"
          value={payload.description}
          onChange={(e) => field("description", e.target.value)}
          minLength={10}
          maxLength={5000}
          rows={5}
          required
        />
      </label>
      <div className="two-columns">
        <label>
          {t.category}
          <select
            aria-label={t.category}
            value={payload.category}
            onChange={(e) => field("category", e.target.value)}
            required
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.condition}
          <select
            aria-label={t.condition}
            value={payload.condition}
            onChange={(e) => field("condition", e.target.value)}
          >
            {conditions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {applicable.length > 0 && (
        <fieldset className="stack category-fields">
          <legend>{a.details}</legend>
          {applicable.map((d) => (
            <label key={d.id}>
              {lang === "my" ? d.name_my : d.name_en}
              <small>{d.required ? a.required : a.optional}</small>
              {d.type === "ENUM" || d.type === "BOOLEAN" ? (
                <select
                  aria-label={lang === "my" ? d.name_my : d.name_en}
                  value={payload.attributes[d.id] ?? ""}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      attributes: { ...p.attributes, [d.id]: e.target.value },
                    }))
                  }
                  required={d.required}
                >
                  <option value="">{a.choose}</option>
                  {(d.type === "BOOLEAN"
                    ? [
                        ["true", a.yes],
                        ["false", a.no],
                      ]
                    : d.choices.map((v) => [v, v])
                  ).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  aria-label={lang === "my" ? d.name_my : d.name_en}
                  type={
                    d.type === "NUMBER"
                      ? "number"
                      : d.type === "DATE"
                        ? "date"
                        : "text"
                  }
                  step={d.type === "NUMBER" ? "any" : undefined}
                  value={payload.attributes[d.id] ?? ""}
                  maxLength={500}
                  required={d.required}
                  onChange={(e) =>
                    setPayload((p) => ({
                      ...p,
                      attributes: { ...p.attributes, [d.id]: e.target.value },
                    }))
                  }
                />
              )}
            </label>
          ))}
        </fieldset>
      )}
      <fieldset>
        <legend>{t.listingType}</legend>
        <div className="segmented">
          <label>
            <input
              type="radio"
              name="type"
              value="SALE"
              checked={payload.type === "SALE"}
              onChange={() => field("type", "SALE")}
            />
            {t.selling}
          </label>
          <label>
            <input
              type="radio"
              name="type"
              value="FREE"
              checked={payload.type === "FREE"}
              onChange={() => field("type", "FREE")}
            />
            {t.giving}
          </label>
        </div>
      </fieldset>
      {payload.type === "SALE" && (
        <label>
          {t.price}
          <input
            name="price"
            type="number"
            min={1}
            max={999999999999}
            step={1}
            required
            value={payload.price}
            onChange={(e) => field("price", e.target.value)}
          />
        </label>
      )}
      <LocationPicker
        locations={locations}
        value={payload.location}
        onChange={(value) => field("location", value)}
        lang={lang}
        label={t.location}
        allLabel="—"
        required
      />
      <div className="editor-buttons">
        {kind === "draft" && (
          <button
            disabled={pending}
            className="button secondary"
            name="mode"
            value="save"
            formNoValidate
          >
            {pending ? a.saving : a.saveDraft}
          </button>
        )}
        <button
          disabled={pending}
          className="button primary"
          name="mode"
          value={kind === "draft" ? "publish" : "save"}
        >
          {pending ? a.saving : kind === "draft" ? t.publish : t.update}
          {kind === "draft" ? " ↗" : ""}
        </button>
      </div>
    </form>
  );
}
