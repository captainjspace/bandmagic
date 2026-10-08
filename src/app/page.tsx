export const dynamic = "force-dynamic";

import Link from "next/link";
import { config } from "@/lib/config";
import { getTrackGroups } from "@/lib/firestore";
import { mockTrackGroups } from "@/lib/mock";
import { tagBgClass, tagClass } from "@/lib/tag";
import type { TrackGroup } from "@/types";

/** element colors */
const colors = {
  page: {
    title: "text-rbblue-600 rbdrop",
    count: "text-rbcyan-800",
  },
  trackGroupCard: {
    title: "text-rbyellow-700 group-hover:text-rbred-700",
    description: "text-gradient-brand",
    meta: "text-rbpurple-600",
    separator: "text-rbpurple-700",
    editLink: "text-rbpurple-600 hover:text-rbred-400",
    emptyText: "text-rbpurple-600",
    emptyLink: "text-cyan-400/50 hover:underline",
  },
  newLink:
    "border border-rbyellow-700 hover:border-rborange-600 text-rbyellow-500 hover:text-rbred-500 rounded px-3 py-1.5 text-sm transition-colors",
};

async function getTrackGroupsList(): Promise<TrackGroup[]> {
  if (config.useMock) return mockTrackGroups;
  return getTrackGroups();
}

export default async function HomePage() {
  const trackGroups = await getTrackGroupsList();

  return (
    <div>
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1
            className={`rbdrop font-bold text-3xl ${colors.page.title} tracking-tight`}
          >
            TrackGroups
          </h1>
          <p className={`${colors.page.count} mt-1 text-md`}>
            {trackGroups.length} trackGroup{trackGroups.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/track-group/new" className={colors.newLink}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            id="Music-Note-1--Streamline-Sharp"
            height="24"
            width="24"
          >
            <desc>Music Note 1 Streamline Icon: https://streamlinehq.com</desc>
            <g id="music-note-1--music-audio-note-entertainment">
              <path
                id="Rectangle 2252"
                fill="#fddc5c"
                d="M0 12C0 5.37258 5.37258 0 12 0c6.6274 0 12 5.37258 12 12 0 6.6274 -5.3726 12 -12 12 -6.62742 0 -12 -5.3726 -12 -12Z"
                strokeWidth="1"
              ></path>
              <path
                id="Union"
                fill="#0c098c"
                fill-rule="evenodd"
                d="M11 0H9.75v14.277C8.95023 13.7843 8.00831 13.5 7 13.5c-2.89949 0 -5.25 2.3505 -5.25 5.25S4.10051 24 7 24c2.8995 0 5.25 -2.3505 5.25 -5.25V2.5h0.25c4.0041 0 7.25 3.24594 7.25 7.25h2.5C22.25 4.36522 17.8848 0 12.5 0H11Z"
                clip-rule="evenodd"
                stroke-width="1"
              ></path>
            </g>
          </svg>{" "}
          + New Track Group
        </Link>
      </div>

      {trackGroups.length === 0 && (
        <p className={`${colors.trackGroupCard.emptyText} text-sm`}>
          No trackGroups yet.{" "}
          <Link
            href="/track-group/new"
            className={colors.trackGroupCard.emptyLink}
          >
            Create one.
          </Link>
        </p>
      )}

      <div className="space-y-4">
        {trackGroups.map((trackGroup) => (
          <div
            key={trackGroup.id}
            className="group rounded-lg border border-rborange-600 transition-all hover:border-rbred-600 hover:bg-rbblue-900/30"
          >
            <div className="flex items-start gap-4">
              <Link
                href={`/track-group/${trackGroup.id}`}
                className="min-w-0 flex-1 p-5"
              >
                <h2
                  className={`${colors.trackGroupCard.title} truncate font-semibold transition-colors`}
                >
                  {trackGroup.title}
                </h2>
                {trackGroup.description && (
                  <p
                    className={`${colors.trackGroupCard.description} mt-1 line-clamp-2 text-sm`}
                  >
                    {trackGroup.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {(() => {
                    const n = trackGroup.tracks.filter((t) =>
                      t.path?.trim(),
                    ).length;
                    return (
                      <span className={`${colors.trackGroupCard.meta} text-xs`}>
                        {n} track{n !== 1 ? "s" : ""}
                      </span>
                    );
                  })()}
                  <span className={`${colors.trackGroupCard.separator}`}>
                    ·
                  </span>
                  <span className={`${colors.trackGroupCard.meta} text-xs`}>
                    {new Date(trackGroup.createdAt).toLocaleDateString()}
                  </span>
                  {(() => {
                    const validTracks = trackGroup.tracks.filter((t) =>
                      t.path?.trim(),
                    );
                    const tagChips = [
                      ...new Set(validTracks.flatMap((t) => t.tags ?? [])),
                    ];
                    const stageChips = [
                      ...new Set(
                        validTracks
                          .filter((t) => !t.tags || t.tags.length === 0)
                          .map((t) => t.stage)
                          .filter((s): s is string => !!s && s !== "unknown"),
                      ),
                    ];
                    return (
                      <>
                        {tagChips.length > 0 && (
                          <div className="ml-1 flex items-center gap-1.5">
                            <span className="text-neutral-600 text-xs">
                              Tag Chips:
                            </span>
                            {tagChips.map((tag) => (
                              <span
                                key={tag}
                                className={`rounded border px-1.5 py-0.5 text-xs ${tagClass(tag, "track")} ${tagBgClass(tag, "track")}`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {stageChips.length > 0 && (
                          <div className="ml-1 flex items-center gap-1.5">
                            <span className="text-neutral-600 text-xs">
                              Stage Chips:
                            </span>
                            {stageChips.map((stage) => (
                              <span
                                key={stage}
                                title="Legacy stage value — not yet migrated to a tag"
                                className="rounded border border-neutral-700 border-dashed px-1.5 py-0.5 text-neutral-500 text-xs"
                              >
                                {stage}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </Link>
              <Link
                href={`/admin/${trackGroup.id}`}
                className={`${colors.trackGroupCard.editLink} shrink-0 rounded-r-lg px-3 py-5 text-sm transition-colors hover:bg-rborange-500`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 48 48"
                  id="Pencil-Circle--Streamline-Plump-Gradient"
                  height="48"
                  width="48"
                >
                  <desc>
                    Pencil Circle Streamline Icon: https://streamlinehq.com
                  </desc>
                  <g id="pencil-circle--change-circle-edit-modify-pencil-write-writing">
                    <path
                      id="Union"
                      fill="url(#paint0_linear_7979_903)"
                      fill-rule="evenodd"
                      d="M34.4888 2.4814C36.051.91925 38.4294.226574 40.4035 1.53742c.9551.63429 2.0811 1.51975 3.31 2.74871 1.229 1.22896 2.1145 2.3549 2.7487 3.31006 1.3109 1.97404.6182 4.35251-.9439 5.91461l-1.9342 1.9342c-.0606-.1198-.1251-.2438-.1937-.3717-.8143-1.5177-2.2058-3.5826-4.5436-5.92044-2.3378-2.3378-4.4027-3.72925-5.9204-4.54362-.1279-.06863-.2519-.13312-.3717-.1937l1.9341-1.93414Zm-4.1971 4.19731c.3067.12251.7177.30619 1.2166.57389 1.2583.67521 3.0866 1.89052 5.2175 4.0215 2.131 2.1309 3.3463 3.9592 4.0215 5.2175.2677.4989.4514.9099.5739 1.2165L26.8024 32.2268c-.6113.6113-1.4045 1.0474-2.3047 1.1343-1.3289.1283-3.7833.2436-7.5749-.0216-1.2118-.0848-2.1776-1.0506-2.2624-2.2624-.2652-3.7917-.1499-6.2461-.0216-7.5749.0869-.9003.523-1.6935 1.1343-2.3048L30.2917 6.67871ZM16.7134 36.3324c3.9416.2757 6.5632.1608 8.0726.0151 1.7082-.1649 3.1228-.9842 4.1377-1.9991l16.1747-16.1747C45.6853 20.1806 46 22.3035 46 24.5 46 36.9264 35.9264 47 23.5 47S1 36.9264 1 24.5 11.0736 2 23.5 2c2.1965 0 4.3196.31475 6.3264.90162L13.6517 19.0764c-1.0149 1.0149-1.8341 2.4295-1.9991 4.1377-.1457 1.5094-.2606 4.131.0151 8.0726.1891 2.7036 2.3421 4.8566 5.0457 5.0457Z"
                      clip-rule="evenodd"
                    ></path>
                  </g>
                  <defs>
                    <linearGradient
                      id="paint0_linear_7979_903"
                      x1="51.152"
                      x2="-11.101"
                      y1="56.776"
                      y2="12.555"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stop-color="#ffd600"></stop>
                      <stop offset="1" stop-color="#ff007a"></stop>
                    </linearGradient>
                  </defs>
                </svg>{" "}
                Edit
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
