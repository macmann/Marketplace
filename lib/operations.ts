import { query } from "./db";
export async function operationalHealth() {
  const [state] = await query(`SELECT
  (SELECT last_seen>now()-interval '2 minutes' FROM service_heartbeats WHERE name='worker') worker,
  (SELECT count(*) FROM image_deletions WHERE attempts>5) failed_images,
  (SELECT count(*) FROM listings WHERE status='PENDING_REVIEW') review_backlog,
  (SELECT count(*) FROM push_deliveries WHERE attempts>=5) failed_push,
  (SELECT count(*) FROM reports WHERE status='OPEN') report_backlog`);
  return {
    worker: state.worker === true,
    failedPush: Number(state.failed_push),
    failedImages: Number(state.failed_images),
    reviewBacklog: Number(state.review_backlog),
    reportBacklog: Number(state.report_backlog),
  };
}
