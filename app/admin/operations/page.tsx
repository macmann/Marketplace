import { uiCopy } from "@/lib/ui-i18n";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { operationalHealth } from "@/lib/operations";
export default async function Operations() {
  const ui = await uiCopy();

  await requireAdmin();
  const h = await operationalHealth();
  return (
    <section className="wrap page narrow">
      <Link href="/admin">{ui("← Admin")}</Link>
      <h1>{ui("Operations")}</h1>
      <div className="panel">
        <p>
          {ui("Maintenance worker:")}{" "}
          {h.worker
            ? ui("Healthy")
            : ui("Missing heartbeat — check worker and Redis")}
        </p>
        <p>
          {ui("Repeated image cleanup failures:")}
          {h.failedImages}
        </p>
        <p>
          {ui("Exhausted push retries:")}
          {h.failedPush}
        </p>
        <p>
          {ui("Listings awaiting review:")}
          {h.reviewBacklog}
        </p>
        <p>
          {ui("Open reports:")}
          {h.reportBacklog}
        </p>
      </div>
      <p>
        {ui(
          "Monitor /api/health for web/database availability and /api/ready for worker readiness. Read the Coolify operations runbook for backup, restore, alerts and incident response.",
        )}
      </p>
    </section>
  );
}
