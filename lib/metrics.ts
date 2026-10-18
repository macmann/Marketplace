import { query } from "./db";
export async function recordMetric(event: "SEARCH" | "VIEW" | "CONTACT") {
  try {
    await query(
      "INSERT INTO daily_metrics(day,event,count) VALUES(current_date,$1,1) ON CONFLICT(day,event) DO UPDATE SET count=daily_metrics.count+1",
      [event],
    );
  } catch {
    console.error(JSON.stringify({ event: "metrics_write_failed" }));
  }
}
