"use client";

import { useEffect } from "react";
import { authenticatedFetch, BACKEND_URL } from "@/lib/backend";

function decodeKey(value: string): Uint8Array {
  const padded = value + "=".repeat((4 - value.length % 4) % 4);
  const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

export function PushNotificationSetup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || Notification.permission !== "granted") return;
    void (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const keyResponse = await authenticatedFetch(`${BACKEND_URL}/api/push-subscriptions/public-key`);
        if (!keyResponse.ok) return;
        const { publicKey } = await keyResponse.json() as { publicKey: string | null };
        if (!publicKey) return;
        const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(publicKey).buffer as ArrayBuffer });
        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return;
        await authenticatedFetch(`${BACKEND_URL}/api/push-subscriptions`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }),
        });
      } catch {
        // Push is an enhancement; notification inbox functionality remains available.
      }
    })();
  }, []);

  return null;
}
