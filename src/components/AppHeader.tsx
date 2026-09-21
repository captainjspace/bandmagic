"use client";

import Link from "next/link";
import { useState } from "react";
import { AddAssetModal } from "@/components/AddAssetModal";
import { AddTrackModal } from "@/components/AddTrackModal";

/** element colors */
const colors = {
  bar: "bg-neutral-950/90 backdrop-blur border-b border-neutral-800",
  brand:
    "font-agincourt text-rbyellow-500 text-2xl sm:text-4xl md:text-feature-title leading-none tracking-wide",
  navLink: "hover:text-neutral-100 transition-colors",
  action:
    "border border-neutral-700 hover:border-green-600 hover:text-green-400 text-neutral-300 rounded px-2.5 py-1 transition-colors disabled:opacity-50",
};

type ActiveModal = "track" | "asset" | null;

export function AppHeader() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [syncing, setSyncing] = useState(false);

  const sync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await fetch("/api/admin/sync", { method: "POST" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 px-6 py-4 ${colors.bar}`}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className={colors.brand}>
            Rolling Blackout
          </Link>
          <div className="flex items-center gap-4">
            <nav className="flex gap-6 text-xs text-neutral-400">
              <Link href="/" className={colors.navLink}>
                TrackGroups
              </Link>
              <Link href="/browse" className={colors.navLink}>
                Songs
              </Link>
              <Link href="/admin/assets" className={colors.navLink}>
                Assets
              </Link>
              <Link href="/admin" className={colors.navLink}>
                Admin
              </Link>
            </nav>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveModal("track")}
                className={colors.action}
              >
                + Track
              </button>
              <button
                type="button"
                onClick={() => setActiveModal("asset")}
                className={colors.action}
              >
                + Asset
              </button>
              <button
                type="button"
                onClick={sync}
                disabled={syncing}
                className={colors.action}
              >
                {syncing ? "↻ Syncing…" : "↻ Sync"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {activeModal === "track" && (
        <AddTrackModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "asset" && (
        <AddAssetModal onClose={() => setActiveModal(null)} />
      )}
    </>
  );
}
