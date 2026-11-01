export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import Link from "next/link";
import { TrackGroupList } from "@/components/TrackGroupList";
import { config } from "@/lib/config";
import { getTrackGroups } from "@/lib/firestore";
import { userEmail } from "@/lib/identity";
import { mockTrackGroups } from "@/lib/mock";

export default async function TrackGroupsPage() {
  const trackGroups = config.useMock ? mockTrackGroups : await getTrackGroups();
  const viewer = userEmail(await headers());

  return (
    <div>
      <div className="mb-10 flex items-start justify-between">
        <div>
          <h1 className="rb-page-title">TrackGroups</h1>
          <p className="text-md mt-1 text-rbcyan-500">
            {trackGroups.length} trackGroup{trackGroups.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/track-group/new" className="rb-new-link">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            height="24"
            width="24"
            aria-hidden
          >
            <path
              fill="#fddc5c"
              d="M0 12C0 5.37258 5.37258 0 12 0c6.6274 0 12 5.37258 12 12 0 6.6274 -5.3726 12 -12 12 -6.62742 0 -12 -5.3726 -12 -12Z"
            />
            <path
              fill="#0c098c"
              fillRule="evenodd"
              d="M11 0H9.75v14.277C8.95023 13.7843 8.00831 13.5 7 13.5c-2.89949 0 -5.25 2.3505 -5.25 5.25S4.10051 24 7 24c2.8995 0 5.25 -2.3505 5.25 -5.25V2.5h0.25c4.0041 0 7.25 3.24594 7.25 7.25h2.5C22.25 4.36522 17.8848 0 12.5 0H11Z"
              clipRule="evenodd"
            />
          </svg>{" "}
          + New Track Group
        </Link>
      </div>

      {trackGroups.length === 0 ? (
        <p className="tg-meta text-sm">
          No trackGroups yet.{" "}
          <Link href="/track-group/new" className="rb-nav-link">
            Create one.
          </Link>
        </p>
      ) : (
        <TrackGroupList initial={trackGroups} viewer={viewer} />
      )}
    </div>
  );
}
