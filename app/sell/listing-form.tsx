"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { publish } from "../actions";
import type { en } from "@/lib/i18n";
function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="button primary" disabled={pending}>
      {pending ? "…" : label + " ↗"}
    </button>
  );
}
export default function ListingForm({
  t,
  categories,
  locations,
  conditions,
}: {
  t: typeof en;
  categories: { id: string; label: string }[];
  locations: { id: string; label: string }[];
  conditions: { id: string; label: string }[];
}) {
  const [type, setType] = useState("SALE");
  return (
    <form action={publish} className="stack panel listing-form">
      <label className="upload-zone">
        ↥ <strong>{t.photos}</strong>
        <small>JPEG · PNG · WebP · AVIF · 8 MB / image</small>
        <input
          type="file"
          name="photos"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          required
        />
      </label>
      <label>
        {t.title}
        <input name="title" minLength={3} maxLength={120} required />
      </label>
      <label>
        {t.description}
        <textarea
          name="description"
          minLength={10}
          maxLength={5000}
          rows={5}
          required
        />
      </label>
      <div className="two-columns">
        <label>
          {t.category}
          <select name="category" required>
            <option value="">—</option>
            {categories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.condition}
          <select name="condition" required>
            {conditions.map((c) => (
              <option value={c.id} key={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend>{t.listingType}</legend>
        <div className="segmented">
          <label>
            <input
              type="radio"
              name="type"
              value="SALE"
              checked={type === "SALE"}
              onChange={() => setType("SALE")}
            />
            {t.selling}
          </label>
          <label>
            <input
              type="radio"
              name="type"
              value="FREE"
              checked={type === "FREE"}
              onChange={() => setType("FREE")}
            />
            {t.giving}
          </label>
        </div>
      </fieldset>
      {type === "SALE" ? (
        <label>
          {t.price}
          <input
            type="number"
            name="price"
            min="1"
            max="999999999999"
            step="1"
            required
          />
        </label>
      ) : (
        <input type="hidden" name="price" value="0" />
      )}
      <label>
        {t.location}
        <select name="location" required>
          <option value="">—</option>
          {locations.map((l) => (
            <option value={l.id} key={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
      <Submit label={t.publish} />
    </form>
  );
}
