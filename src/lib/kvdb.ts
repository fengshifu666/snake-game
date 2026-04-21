import type { StoreData } from "@/lib/types";

const STORE_URL =
  process.env.JSONBLOB_STORE_URL ??
  "https://jsonblob.com/api/jsonBlob/019daed7-e3e1-7540-9ac5-8903c7eb01a3";

const EMPTY_STORE: StoreData = {
  users: {},
  leaderboard: [],
};

export async function readStore() {
  const response = await fetch(STORE_URL, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Remote store read failed with status ${response.status}`);
  }

  const payload = (await response.json()) as Partial<StoreData>;

  return {
    users: payload.users ?? {},
    leaderboard: payload.leaderboard ?? [],
  } satisfies StoreData;
}

export async function writeStore(value: StoreData) {
  const response = await fetch(STORE_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Remote store write failed with status ${response.status}`);
  }
}

export function createEmptyStore() {
  return structuredClone(EMPTY_STORE);
}
