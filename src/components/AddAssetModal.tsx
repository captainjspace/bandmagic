"use client";

import { useState } from "react";
import { AssetCreateForm } from "@/components/AssetCreateForm";
import { Modal } from "@/components/Modal";
import type { Asset } from "@/types";

interface Props {
  onClose: () => void;
}

export function AddAssetModal({ onClose }: Props) {
  const [lastCreated, setLastCreated] = useState<Asset | null>(null);

  return (
    <Modal title="Add asset" onClose={onClose}>
      <p className="text-xs text-neutral-500 mb-3">
        Document or web link (Drive doc, review, post). For audio, use{" "}
        <span className="text-neutral-300">+ Track</span> instead.
      </p>
      {lastCreated && (
        <div className="mb-3 p-2 border border-green-800 bg-green-950/30 rounded text-xs text-green-400">
          Created "{lastCreated.title}".
        </div>
      )}
      <AssetCreateForm onCreated={setLastCreated} />
    </Modal>
  );
}
