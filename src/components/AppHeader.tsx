"use client";

import Link from "next/link";
import { useState } from "react";
import { AddAssetModal } from "@/components/AddAssetModal";
import { AddTrackModal } from "@/components/AddTrackModal";
import { NavMenu } from "@/components/NavMenu";

const textDecoration={
  bigWave: "underline overline decoration-wavy decoration-6 decoration-rbcyan-300",
}

/** element colors */
const colors = {
  bar: "bg-rbcyan-300/10 backdrop-blur border-b border-rbred-800",
  brand:
  `"${textDecoration.bigWave} font-agincourt text-rborange-100 text-2xl sm:text-xl md:text-feature-title leading-none tracking-wide"`,
  navLink: `"text-xl hover:text-rborange-500 transition-colors"`,
  action:
  "border-2 rounded-md border-rbpurple-700 hover:border-rbred-500 hover:text-rborange-300 text-rbcyan-500 rounded px-4 py-2 transition-colors disabled:opacity-50",
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
          <div className={colors.brand}>
            <NavMenu />
          </div>
      
          <div className="font-agincourt flex items-center gap-4">
            
            <div className="outline-rbmist-300 outline-offset-4 border-2 border-rbcyan-300 rounded-md">
         
              <div className="text-center text-md font-mono text-shadow-md text-rbcyan-500 
                              text-shadow-rbyellow-300 tracking-widest py-2">
                Actions
              </div>

              <div className="flex items-center gap-1 text-lg">
                <button
                  type="button"
                  onClick={() => setActiveModal("track")}
                  className={colors.action}
                >
                  🛤️ + Track
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal("asset")}
                  className={colors.action}
                >
                  💼 + Asset
                </button>
                <button
                  type="button"
                  onClick={sync}
                  disabled={syncing}
                  className={colors.action}
                >
                  {" "}
                  🕰️
                  {syncing ? "↻ Syncing…" : "↻ Sync"}
                </button>
              </div>
            </div>
            

            <nav className="flex gap-6 text-xl text-rborange-700">
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
