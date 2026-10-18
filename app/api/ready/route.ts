import { operationalHealth } from "@/lib/operations";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const s = await operationalHealth();
    return Response.json(
      { status: s.worker ? "ready" : "degraded" },
      {
        status: s.worker ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
