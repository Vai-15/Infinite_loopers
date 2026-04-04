"use client";

import { useLendwise } from "./LendwiseProvider";

export default function NotificationContainer() {
  const { notifications } = useLendwise();
  if (!notifications.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur ${
            n.type === "error"
              ? "border-red-500/40 bg-red-950/90 text-red-100"
              : n.type === "success"
                ? "border-teal-500/40 bg-teal-950/90 text-teal-50"
                : "border-slate-600 bg-slate-900/95 text-slate-100"
          }`}
        >
          {n.message}
        </div>
      ))}
    </div>
  );
}
