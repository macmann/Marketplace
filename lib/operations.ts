import { query } from "./db";
export async function operationalHealth() {
  const [state] = await query(`SELECT
  (SELECT last_seen>now()-interval '2 minutes' FROM service_heartbeats WHERE name='worker') worker,
  (SELECT count(*) FROM image_deletions WHERE attempts>5) failed_images,
  (SELECT count(*) FROM listings WHERE status='PENDING_REVIEW') review_backlog,
  (SELECT count(*) FROM push_deliveries WHERE attempts>=5) failed_push,
  (SELECT count(*) FROM image_jobs WHERE attempts>=5) failed_processing,
  (SELECT count(*) FROM moderation_jobs WHERE attempts>0) moderation_retry,
  (SELECT count(*) FROM reports WHERE status='OPEN') report_backlog`);
  return {
    worker: state.worker === true,
    failedProcessing: Number(state.failed_processing),
    moderationRetry: Number(state.moderation_retry),
    failedPush: Number(state.failed_push),
    failedImages: Number(state.failed_images),
    reviewBacklog: Number(state.review_backlog),
    reportBacklog: Number(state.report_backlog),
  };
}
