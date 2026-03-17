"use client";
import { createContext, ReactNode } from "react";
import { usePWAInstall } from "../hooks/usePWAInstall";
import PWAInstallDialog from "./PWAInstallDialog";

type PWAContextType = ReturnType<typeof usePWAInstall>;

export const PWAContext = createContext<PWAContextType | null>(null);

export function PWAProvider({ children }: { children: ReactNode }) {
  const pwa = usePWAInstall();
  return (
    <PWAContext.Provider value={pwa}>
      {children}
      <PWAInstallDialog />
    </PWAContext.Provider>
  );
}
