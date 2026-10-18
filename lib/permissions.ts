export type Permission = "support" | "moderate" | "configure";
export function permits(role: string, permission: Permission) {
  return (
    role === "ADMIN" ||
    (permission === "support" && ["SUPPORT", "MODERATOR"].includes(role)) ||
    (permission === "moderate" && role === "MODERATOR")
  );
}
