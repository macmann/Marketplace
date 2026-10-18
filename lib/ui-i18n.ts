import { locale } from "./i18n";
import { uiFor } from "./ui-copy";
export async function uiCopy() {
  return uiFor(await locale());
}
