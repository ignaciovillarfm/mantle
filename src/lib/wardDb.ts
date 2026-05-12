import Dexie, { type Table } from "dexie";

export type CacheRow = {
  key: string;
  json: string;
  updatedAt: number;
};

class WardDb extends Dexie {
  cache!: Table<CacheRow, string>;

  constructor() {
    super("mantle-ward-cache");
    this.version(1).stores({ cache: "key" });
  }
}

export const wardDb = typeof window !== "undefined" ? new WardDb() : null;
