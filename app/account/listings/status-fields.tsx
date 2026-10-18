"use client";
import { useFormStatus } from "react-dom";
export default function StatusFields({
  id,
  options,
  statusLabel,
  updateLabel,
}: {
  id: string;
  options: [string, string][];
  statusLabel: string;
  updateLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        aria-label={statusLabel}
        disabled={pending || !options.length}
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button
        className="button secondary compact"
        disabled={pending || !options.length}
      >
        {updateLabel}
      </button>
    </>
  );
}
