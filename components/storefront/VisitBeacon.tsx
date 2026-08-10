"use client";

import { useEffect } from "react";

export function VisitBeacon({ slug, path }: { slug: string; path?: string }) {
  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, path }),
      keepalive: true,
    }).catch(() => {});
  }, [slug, path]);
  return null;
}
