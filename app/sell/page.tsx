import { requireUser } from "@/lib/auth";
import Editor from "./editor";
export default async function Sell() {
  const u = await requireUser();
  return <Editor verified={u.phone_verified || u.email_verified} />;
}
