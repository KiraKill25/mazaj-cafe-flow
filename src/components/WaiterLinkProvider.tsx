import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { usePos } from "@/lib/pos";
import { useWaiterLink } from "@/lib/waiterLink";

type Link = ReturnType<typeof useWaiterLink>;
const Ctx = createContext<Link | null>(null);

/** Keeps the register ↔ waiter sync (orders + clock-ins) running on every PC screen, not only the register. */
export function WaiterLinkProvider({ children }: { children: ReactNode }) {
  const pos = usePos();
  const { pathname } = useLocation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // The waiter phone page must never act as the register.
  const link = useWaiterLink(pos, mounted && !pathname.startsWith("/waiter"));
  return <Ctx.Provider value={link}>{children}</Ctx.Provider>;
}

export function useLink(): Link {
  const l = useContext(Ctx);
  if (!l) throw new Error("WaiterLinkProvider missing");
  return l;
}
