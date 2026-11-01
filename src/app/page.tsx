export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { StarIcon } from "@/components/StarIcon";
import { config } from "@/lib/config";
import { getTasks, getTrackGroups } from "@/lib/firestore";
import { userEmail } from "@/lib/identity";
import { mockTrackGroups } from "@/lib/mock";
import {
  bandRating,
  isActive,
  MAX_STARS,
  STAR_UNIT,
  sortTrackGroups,
  starsFor,
} from "@/lib/track-group";
import type { Task, TrackGroup } from "@/types";

function PinIcon() {
  // biome-ignore lint/performance/noImgElement: 16px static logo
  return <img src="/rb256.png" alt="" className="tg-pin-icon" />;
}

function TaskIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 text-rbcyan-300">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        d="M4 4h16v16H4zM8 12l3 3 5-6"
      />
    </svg>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="rb-stars" aria-label={`${n} stars`}>
      {Array.from({ length: n }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decoration
        <StarIcon key={i} className="text-rbyellow-400" />
      ))}
    </span>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: ReactNode;
  empty?: string;
  children: ReactNode[];
}) {
  if (children.length === 0 && !empty) return null;
  return (
    <section className="rb-dash-section">
      <h2 className="rb-label mb-2 flex items-center gap-2">{title}</h2>
      {children.length ? (
        <ul className="space-y-0.5">{children}</ul>
      ) : (
        <p className="tg-meta">{empty}</p>
      )}
    </section>
  );
}

function GroupLink({ tg, icon }: { tg: TrackGroup; icon?: ReactNode }) {
  return (
    <li>
      <Link href={`/track-group/${tg.id}`} className="rb-dash-link">
        {icon ?? (tg.pinned ? <PinIcon /> : null)}
        <span>{tg.title}</span>
      </Link>
    </li>
  );
}

function TaskLink({ task }: { task: Task }) {
  const href =
    task.target.kind === "track-group"
      ? `/track-group/${task.target.id}`
      : `/browse?editSong=${encodeURIComponent(task.target.id)}`;
  return (
    <li>
      <Link href={href} className="rb-dash-link">
        <TaskIcon />
        <span className="flex flex-col">
          <span>{task.title}</span>
          <span className="tg-meta">
            {task.target.name}
            {task.dueDate && ` · due ${task.dueDate}`}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default async function HomePage() {
  const viewer = userEmail(await headers());
  const [groups, tasks] = await Promise.all([
    config.useMock ? mockTrackGroups : getTrackGroups(),
    config.useMock || !viewer
      ? Promise.resolve([] as Task[])
      : getTasks({ assignee: viewer }),
  ]);
  const active = sortTrackGroups(
    groups.filter((g) => isActive(g)),
    viewer,
  );

  const pinned = sortTrackGroups(
    groups.filter((g) => g.pinned),
    viewer,
  );
  const openTasks = tasks.filter((t) => !t.done);
  // Band-wide buckets use everyone's average, so they differ from My Favorites.
  const buckets = Array.from(
    { length: MAX_STARS },
    (_, i) => MAX_STARS - i,
  ).map((n) => ({
    n,
    groups: active
      .filter((g) => starsFor(bandRating(g)) === n)
      .sort((a, b) => bandRating(b) - bandRating(a)),
  }));
  const unrated = active.filter((g) => bandRating(g) < STAR_UNIT);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="rb-page-title">Home</h1>
        <Link href="/track-groups" className="rb-nav-link">
          All track groups →
        </Link>
      </div>
      <div className="rb-dash">
        <Section
          title={
            <>
              <TaskIcon /> My Tasks
            </>
          }
          empty="Nothing assigned to you."
        >
          {openTasks.map((t) => (
            <TaskLink key={t.id} task={t} />
          ))}
        </Section>
        <Section
          title={
            <>
              <PinIcon /> Band Pinned
            </>
          }
          empty="Nothing pinned yet."
        >
          {pinned.map((g) => (
            <GroupLink key={g.id} tg={g} icon={<PinIcon />} />
          ))}
        </Section>
        {buckets.map(({ n, groups: bucket }) => (
          <Section
            key={n}
            title={
              <>
                <Stars n={n} /> Active
              </>
            }
          >
            {bucket.map((g) => (
              <GroupLink key={g.id} tg={g} />
            ))}
          </Section>
        ))}
        <Section title="Active — unrated">
          {unrated.map((g) => (
            <GroupLink key={g.id} tg={g} />
          ))}
        </Section>
      </div>
    </div>
  );
}
