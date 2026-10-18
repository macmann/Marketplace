import { uiCopy } from "@/lib/ui-i18n";
import { reportReasons } from "@/lib/report-reasons";
import { releaseCopy } from "@/lib/release-i18n";
import { reportTarget } from "./actions";
export default async function ReportForm({
  kind,
  id,
}: {
  kind: "user" | "message";
  id: string;
}) {
  const t = await releaseCopy();
  const ui = await uiCopy();
  return (
    <details className="panel">
      <summary>{kind === "user" ? t.reportUser : t.reportMessage}</summary>
      <form action={reportTarget} className="stack">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <label>
          {t.reason}
          <select name="reason">
            {reportReasons.map((r) => (
              <option key={r} value={r}>
                {ui(r)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.detail}
          <textarea name="detail" maxLength={2000} />
        </label>
        <button className="button secondary">{t.submit}</button>
      </form>
    </details>
  );
}
