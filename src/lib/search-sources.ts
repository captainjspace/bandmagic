import { config } from "@/lib/config";
import {
  getAssets,
  getCatalog,
  getSongs,
  getTrackGroups,
} from "@/lib/firestore";
import {
  mockAssets,
  mockCatalog,
  mockSongs,
  mockTrackGroups,
} from "@/lib/mock";
import type { SearchSources } from "@/lib/search";

/** Server-only: load every searchable entity (mock data in USE_MOCK mode). */
export async function loadSearchSources(): Promise<SearchSources> {
  if (config.useMock) {
    return {
      trackGroups: mockTrackGroups,
      songs: mockSongs,
      assets: mockAssets,
    };
  }
  const [trackGroups, songs, assets] = await Promise.all([
    getTrackGroups(),
    getSongs(),
    getAssets(),
  ]);
  return { trackGroups, songs, assets };
}

/** Server-only: the full catalog, for tag search across every audio file. */
export async function loadCatalog() {
  return config.useMock ? mockCatalog : getCatalog();
}
