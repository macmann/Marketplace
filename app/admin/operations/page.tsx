import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { operationalHealth } from "@/lib/operations";
export default async function Operations() {
  await requireAdmin();
  const h = await operationalHealth();
  return (
    <section className="wrap page narrow">
      <Link href="/admin">← Admin</Link>
      <h1>Operations</h1>
      <div className="panel">
        <p>
          Maintenance worker:{" "}
          {h.worker ? "Healthy" : "Missing heartbeat — check worker and Redis"}
        </p>
        <p>Repeated image cleanup failures: {h.failedImages}</p>
        <p>Exhausted push retries: {h.failedPush}</p>
        <p>Listings awaiting review: {h.reviewBacklog}</p>
        <p>Open reports: {h.reportBacklog}</p>
      </div>
      <p>
        Monitor /api/health for web/database availability and /api/ready for
        worker readiness. Read the Coolify operations runbook for backup,
        restore, alerts and incident response.
      </p>
    </section>
  );
}
