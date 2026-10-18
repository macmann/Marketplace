"use client";
import { createContext, useContext } from "react";
import { uiFor } from "@/lib/ui-copy";
const Context = createContext("en");
export function UiProvider({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  return <Context.Provider value={locale}>{children}</Context.Provider>;
}
export function useUi() {
  return uiFor(useContext(Context));
}
