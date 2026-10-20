"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EntityFlag } from "@/components/EntityFlag";
import type { SearchResult } from "@/lib/search";

const TYPEAHEAD_LIMIT = 8;
const DEBOUNCE_MS = 200;

/** Header typeahead over track groups, songs, and assets. Arrow keys pick a
 *  suggestion; Enter opens it, or goes to /search when nothing is picked. */
export function UniversalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(
        `/api/search?q=${encodeURIComponent(query)}&limit=${TYPEAHEAD_LIMIT}`,
        { signal: ctrl.signal },
      )
        .then((r) => (r.ok ? r.json() : []))
        .then((data: SearchResult[]) => {
          setResults(data);
          setActive(-1);
        })
        .catch(() => {});
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  // close on navigation and on outside click
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not a value we read
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const go = (r: SearchResult) => {
    setOpen(false);
    if (r.external) window.open(r.href, "_blank", "noopener,noreferrer");
    else router.push(r.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => Math.max(-1, Math.min(results.length - 1, i + step)));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && results[active]) go(results[active]);
      else if (q.trim()) {
        setOpen(false);
        router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="rb-search">
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search track groups, songs, assets…"
        aria-label="Search"
        aria-expanded={open && results.length > 0}
        aria-controls="universal-search-menu"
        role="combobox"
        className="rb-search-input"
      />
      {open && results.length > 0 && (
        <div
          id="universal-search-menu"
          role="listbox"
          className="rb-search-menu"
        >
          {results.map((r, i) => (
            <button
              key={`${r.kind}-${r.id}`}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r)}
              className={`rb-search-item ${i === active ? "rb-search-item-active" : ""}`}
            >
              <EntityFlag kind={r.kind} />
              <span className="min-w-0 flex-1 truncate">{r.title}</span>
              {r.external && <span aria-hidden>↗</span>}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push(`/search?q=${encodeURIComponent(q.trim())}`);
            }}
            className="rb-search-item rb-label"
          >
            See all results ↵
          </button>
        </div>
      )}
    </div>
  );
}
