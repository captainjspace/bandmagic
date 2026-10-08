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
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs ${tagClass(tag, entityType)} ${tagBgClass(tag, entityType)}`}
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            aria-label={`Remove tag ${tag}`}
            className="text-rbcyan-300 hover:text-red-400"
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
          className="w-20 rounded border border-rbred-100 bg-rbblue-700 px-1.5 py-0.5 text-rbyellow-300 text-xs focus:border-rbblue-500 focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="Add tag"
          className="text-rbpurple-500 text-xs hover:text-rbyellow-700"
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
