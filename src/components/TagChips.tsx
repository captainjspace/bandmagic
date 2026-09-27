"use client";

import { useState } from "react";
import { tagBgClass, tagClass } from "@/lib/tag";

interface Props {
  tags: string[];
  entityType: string;
  suggestions: string[];
  listId: string;
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}

export function TagChips({
  tags,
  entityType,
  suggestions,
  listId,
  onAdd,
  onRemove,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) onAdd(trimmed);
    setValue("");
    setAdding(false);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`text-xs border rounded px-1.5 py-0.5 flex items-center gap-1 ${tagClass(tag, entityType)} ${tagBgClass(tag, entityType)}`}
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            aria-label={`Remove tag ${tag}`}
            className="text-neutral-600 hover:text-red-400"
          >
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          list={listId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setValue("");
              setAdding(false);
            }
          }}
          onBlur={commit}
          placeholder="tag"
          className="text-xs bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 w-20 text-neutral-100 focus:outline-none focus:border-green-600"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="Add tag"
          className="text-xs text-neutral-600 hover:text-neutral-300"
        >
          + tag
        </button>
      )}
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
