import { useEffect, useState, useCallback } from "react";

const NOTIF_KEY = "notifications_enabled";

export function useNotifications() {
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem(NOTIF_KEY) === "true";
  });
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const supported = typeof Notification !== "undefined";

  const toggle = useCallback(async () => {
    if (!supported) return;

    if (!enabled) {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm === "granted") {
        localStorage.setItem(NOTIF_KEY, "true");
        setEnabled(true);
      }
    } else {
      localStorage.setItem(NOTIF_KEY, "false");
      setEnabled(false);
    }
  }, [enabled, supported]);

  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!supported || !enabled || permission !== "granted") return;
      if (document.visibilityState === "visible") return; // don't notify when app is focused
      try {
        new Notification(title, {
          icon: "/logo.png",
          ...options,
        });
      } catch {
        // silent
      }
    },
    [enabled, permission, supported]
  );

  return { enabled, supported, permission, toggle, notify };
}
