"use client";

import { useEffect, useState } from "react";
import { ToastDetail } from "@/lib/toast";
import { Icon } from "@/components/Icon";

export function Toaster() {
  const [toasts, setToasts] = useState<ToastDetail[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const d = (e as CustomEvent<ToastDetail>).detail;
      setToasts((t) => [...t, d]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== d.id)), 3600);
    }
    window.addEventListener("vibe-toast", onToast);
    return () => window.removeEventListener("vibe-toast", onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-16 z-[100] flex w-[320px] max-w-[88vw] flex-col gap-2">
      {toasts.map((t) => {
        const color = t.type === "success" ? "var(--success)" : t.type === "error" ? "var(--danger)" : "var(--accent-2)";
        const icon = t.type === "error" ? "trash" : t.type === "success" ? "flag" : "bolt";
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-border bg-surface-2/95 px-3.5 py-3 text-[13px] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl"
            style={{ animation: "toastIn 0.22s ease-out" }}
            onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
          >
            <span className="mt-0.5 shrink-0" style={{ color }}>
              <Icon name={icon} size={15} />
            </span>
            <span className="leading-relaxed text-foreground">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
