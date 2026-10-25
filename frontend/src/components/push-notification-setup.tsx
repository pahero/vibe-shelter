"use client";

import { useEffect } from "react";
import { ensurePushSubscription } from "@/lib/push-subscription";

export function PushNotificationSetup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || Notification.permission !== "granted") return;
    void ensurePushSubscription().catch(() => {
        // Push is an enhancement; notification inbox functionality remains available.
      });
  }, []);

  return null;
}
