"use client";

import { useState } from "react";
import { AddAssetModal } from "@/components/AddAssetModal";
import { AddTrackModal } from "@/components/AddTrackModal";
import { NavMenu } from "@/components/NavMenu";
import { PlayerBar } from "@/components/PlayerBar";
import { UniversalSearch } from "@/components/UniversalSearch";

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

  const actions = [
    {
      icon: "🛤️",
      text: "+ Track",
      label: "Add track",
      onClick: () => setActiveModal("track"),
    },
    {
      icon: "💼",
      text: "+ Asset",
      label: "Add asset",
      onClick: () => setActiveModal("asset"),
    },
    {
      icon: "🕰️",
      text: syncing ? "↻ Syncing…" : "↻ Sync",
      label: "Sync catalog",
      onClick: sync,
      disabled: syncing,
    },
  ];

  return (
    <>
      <header className="rb-header">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="rb-brand">
              <NavMenu />
            </div>
            <div className="rb-header-actions">
              <div className="rb-header-actions-label">Actions</div>
              <div className="flex items-center gap-1">
                {actions.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={a.onClick}
                    disabled={a.disabled}
                    aria-label={a.label}
                    title={a.label}
                    className="rb-action-btn"
                  >
                    {a.icon}
                    <span className="rb-action-text"> {a.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <UniversalSearch />
          <PlayerBar placement="header" />
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
