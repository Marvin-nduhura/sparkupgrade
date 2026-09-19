"use client";

import { useEffect } from "react";

export function LocationTracker({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) return;

    const ping = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetch("/api/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      );
    };

    ping();
    const id = setInterval(ping, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [enabled]);

  return null;
}
