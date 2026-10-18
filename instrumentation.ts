import type { Instrumentation } from "next";
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  _request,
  context,
) => {
  console.error(
    JSON.stringify({
      event: "request_failed",
      digest:
        typeof error === "object" && error !== null && "digest" in error
          ? error.digest
          : undefined,
      route: context.routePath,
      kind: context.routeType,
    }),
  );
};
