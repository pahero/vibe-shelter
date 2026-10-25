import { authenticatedFetch, BACKEND_URL } from "@/lib/backend";

function decodeApplicationServerKey(value: string): Uint8Array {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

export async function ensurePushSubscription(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications are not supported by this browser.");
  }
  if (Notification.permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  const keyResponse = await authenticatedFetch(`${BACKEND_URL}/api/push-subscriptions/public-key`);
  if (!keyResponse.ok) throw new Error("Unable to load push configuration.");

  const { publicKey } = await keyResponse.json() as { publicKey: string | null };
  if (!publicKey) throw new Error("Push notifications are not configured on the server.");

  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeApplicationServerKey(publicKey).buffer as ArrayBuffer,
  });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error("The browser returned an incomplete push subscription.");
  }

  const response = await authenticatedFetch(`${BACKEND_URL}/api/push-subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }),
  });
  if (!response.ok) throw new Error("Unable to save this device.");
}
