"use client";

import { useEffect } from "react";

/** Stores ?ref=<code> from affiliate links in a cookie for checkout attribution. */
export function RefBeacon() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && /^[a-z0-9]{4,20}$/i.test(ref)) {
        document.cookie = `muya_ref=${ref}; path=/; max-age=${30 * 86400}; samesite=lax`;
      }
    } catch {
      // ignore
    }
  }, []);
  return null;
}
