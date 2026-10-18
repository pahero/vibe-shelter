"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { notificationsApi, UserNotification } from "@/lib/api";
import { ApiErrorHandler, formatDate } from "@/lib/utils";

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const refresh = useCallback(async (showLoading: boolean) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await notificationsApi.list();
      setNotifications(response.data);
      setTotal(response.total);
    } catch (reason) {
      if (showLoading) setError(ApiErrorHandler.handle(reason));
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(false);
    const interval = window.setInterval(() => void refresh(false), 60_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const toggle = async () => {
    if (isOpen) { setIsOpen(false); return; }
    setError(null);
    setIsOpen(true);
    await refresh(true);
  };

  const dismiss = async (notificationId: string) => {
    setDismissingId(notificationId);
    setError(null);
    try {
      await notificationsApi.dismiss(notificationId);
      setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
      setTotal((current) => Math.max(0, current - 1));
    } catch (reason) {
      setError(ApiErrorHandler.handle(reason));
    } finally {
      setDismissingId(null);
    }
  };

  return (
    <div className="relative">
      <button type="button" onClick={toggle} aria-expanded={isOpen} aria-haspopup="dialog" className="relative inline-flex min-h-10 items-center rounded-xl border border-[#d4c7b4] bg-white/45 px-3 text-sm font-semibold text-[#1f2320] transition hover:bg-white">
        Notifications
        {total > 0 && <span className="ml-2 rounded-full bg-[#d05a2c] px-1.5 py-0.5 text-xs text-white">{total > 99 ? "99+" : total}</span>}
      </button>
      {isOpen && <section role="dialog" aria-label="Notifications" className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-[#d4c7b4] bg-[#fff8ee] p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-gray-900">Notifications</h2><button type="button" onClick={() => setIsOpen(false)} className="text-sm font-semibold text-[#b24a20]">Close</button></div>
        {isLoading && <p className="mt-4 text-sm text-[#6d6a66]">Loading notifications...</p>}
        {error && <p className="mt-4 text-sm font-medium text-red-700">{error}</p>}
        {!isLoading && !error && notifications.length === 0 && <p className="mt-4 text-sm text-[#6d6a66]">No notifications.</p>}
        {!isLoading && notifications.length > 0 && <ol className="mt-3 max-h-96 divide-y divide-[#d4c7b4] overflow-auto">{notifications.map((notification) => <li key={notification.id} className="py-3"><p className="text-sm font-semibold text-gray-900">{notification.type === "treatment" ? `New treatment ${notification.comment} starts for cat ${notification.catName} #${notification.catNameNumber}` : notification.comment}</p><p className="mt-1 text-xs text-[#6d6a66]">{notification.type === "treatment" ? "Starts" : "Due"} {formatDate(notification.dueDate)}</p><div className="mt-2 flex items-center justify-between gap-3"><Link href={`/cats/${notification.catId}`} onClick={() => setIsOpen(false)} className="inline-flex text-sm font-semibold text-[#b24a20] hover:text-[#8f3718]">Open cat →</Link>{notification.type === "treatment" && <button type="button" disabled={dismissingId === notification.id} onClick={() => void dismiss(notification.id)} className="rounded-lg border border-[#d4c7b4] px-3 py-1 text-sm font-semibold text-gray-800 hover:bg-white disabled:opacity-50">{dismissingId === notification.id ? "Saving..." : "Done"}</button>}</div></li>)}</ol>}
      </section>}
    </div>
  );
}
