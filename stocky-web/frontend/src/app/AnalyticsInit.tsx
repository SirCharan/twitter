"use client";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

export default function AnalyticsInit() {
  useEffect(() => {
    trackEvent("page_view", window.location.pathname);
  }, []);
  return null;
}
