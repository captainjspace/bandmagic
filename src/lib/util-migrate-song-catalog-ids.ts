import { migrateCatalogEntryIds, migrateSongIds } from "./firestore";

const actor = process.env.LOCAL_USER_EMAIL ?? "migration";

const songResult = await migrateSongIds(actor);
console.log(
  `Songs: migrated ${songResult.migrated}, skipped ${songResult.skipped.length}${
    songResult.skipped.length ? ` (${songResult.skipped.join(", ")})` : ""
  }`,
);

const catalogResult = await migrateCatalogEntryIds();
console.log(`Catalog entries: migrated ${catalogResult.migrated}`);
