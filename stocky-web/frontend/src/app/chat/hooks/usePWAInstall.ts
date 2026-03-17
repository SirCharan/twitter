"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const NEVER_KEY = "stocky-pwa-never";
const INSTALLED_KEY = "stocky-pwa-installed";

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    ("standalone" in window.navigator &&
      (window.navigator as unknown as { standalone: boolean }).standalone) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isIos] = useState(() => isIosSafari());
  const [showDialog, setShowDialog] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const installedHandler = () => {
      localStorage.setItem(INSTALLED_KEY, "1");
      setShowDialog(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const shouldShow = (() => {
    if (typeof window === "undefined") return false;
    if (isStandalone()) return false;
    if (localStorage.getItem(NEVER_KEY) === "1") return false;
    if (localStorage.getItem(INSTALLED_KEY) === "1") return false;
    if (!isMobileDevice()) return false;
    return canInstall || isIos;
  })();

  const install = useCallback(async () => {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      const choice = await deferredPrompt.current.userChoice;
      if (choice.outcome === "accepted") {
        localStorage.setItem(INSTALLED_KEY, "1");
      }
      deferredPrompt.current = null;
      setCanInstall(false);
    }
    setShowDialog(false);
  }, []);

  const dismiss = useCallback((permanent = false) => {
    if (permanent) localStorage.setItem(NEVER_KEY, "1");
    setShowDialog(false);
  }, []);

  const triggerAfterBoot = useCallback(() => {
    if (!shouldShow) return;
    setTimeout(() => setShowDialog(true), 800);
  }, [shouldShow]);

  return { shouldShow, isIos, canInstall, showDialog, install, dismiss, triggerAfterBoot };
}
