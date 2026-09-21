"use client";

import Link from "next/link";
import { useState } from "react";

/** element colors */
const colors = {
  page: {
    title: "text-neutral-100",
    subtitle: "text-neutral-500",
  },
  hub: {
    card: "border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900 rounded-lg p-4 transition-colors",
    title: "text-neutral-100 font-semibold",
    desc: "text-neutral-500 text-sm mt-1",
  },
  tools: {
    panel: "border border-neutral-800 rounded bg-neutral-900/30 px-3 py-2",
    label: "text-neutral-600",
    item: "border border-neutral-700 hover:border-neutral-500 text-neutral-200 rounded px-2.5 py-1 transition-colors disabled:opacity-50",
  },
};

const LINKS = [
  {
    href: "/track-group/new",
    title: "+ New Track Group",
    desc: "Curate tracks, attach assets, notify the band.",
  },
  {
    href: "/",
    title: "Track Groups",
    desc: "Browse and edit existing track groups.",
  },
  {
    href: "/admin/assets",
    title: "Assets",
    desc: "Manage lyrics, chord charts, press, and reviews.",
  },
  {
    href: "/browse",
    title: "Songs",
    desc: "Inspect the GCS bucket backing the catalog.",
  },
];

export default function AdminHubPage() {
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
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${colors.page.title}`}>Admin</h1>
        <p className={`${colors.page.subtitle} text-sm mt-1`}>
          Link hub for managing track groups, tracks, and assets.
        </p>
      </div>

      <div className={`mb-6 ${colors.tools.panel} flex items-center gap-3`}>
        <span
          className={`text-xs uppercase tracking-wider ${colors.tools.label}`}
        >
          Admin tools
        </span>
        <button
          type="button"
          onClick={sync}
          disabled={syncing}
          className={`text-xs ${colors.tools.item}`}
        >
          {syncing ? "↻ Syncing…" : "↻ Sync catalog"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={colors.hub.card}>
            <div className={colors.hub.title}>{link.title}</div>
            <div className={colors.hub.desc}>{link.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
