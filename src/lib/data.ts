import { hashPassword, normalizeUsername } from "@/lib/auth";
import { createEmptyStore, readStore, writeStore } from "@/lib/kvdb";
import type { LeaderboardEntry, PublicUser, StoredUser } from "@/lib/types";

type ValidationResult =
  | {
      ok: true;
      username: string;
    }
  | {
      ok: false;
      message: string;
    };

export function validateCredentials(
  username: string,
  password: string,
): ValidationResult {
  const normalized = normalizeUsername(username);

  if (!/^[a-z0-9_]{3,16}$/.test(normalized)) {
    return {
      ok: false,
      message: "用户名只能包含 3-16 位字母、数字或下划线。",
    };
  }

  if (password.length < 6 || password.length > 32) {
    return {
      ok: false,
      message: "密码长度需要在 6 到 32 位之间。",
    };
  }

  return { ok: true, username: normalized };
}

function toPublicUser(user: StoredUser): PublicUser {
  return {
    username: user.username,
    createdAt: user.createdAt,
    bestScore: user.bestScore,
    lastLoginAt: user.lastLoginAt,
  };
}

export async function getUser(username: string) {
  const store = await readStore();
  return store.users[normalizeUsername(username)] ?? null;
}

export async function getPublicUser(username: string) {
  const user = await getUser(username);
  return user ? toPublicUser(user) : null;
}

export async function createUser(username: string, password: string) {
  const normalized = normalizeUsername(username);
  const store = await readStore().catch(() => createEmptyStore());
  const existing = store.users[normalized];

  if (existing) {
    return {
      ok: false as const,
      message: "用户名已经存在，请换一个。",
    };
  }

  const now = new Date().toISOString();
  const user: StoredUser = {
    username: normalized,
    passwordHash: hashPassword(password),
    createdAt: now,
    lastLoginAt: now,
    bestScore: 0,
  };

  store.users[normalized] = user;
  await writeStore(store);

  return {
    ok: true as const,
    user: toPublicUser(user),
  };
}

export async function markLogin(username: string) {
  const store = await readStore();
  const user = store.users[normalizeUsername(username)];

  if (!user) {
    return null;
  }

  const updated: StoredUser = {
    ...user,
    lastLoginAt: new Date().toISOString(),
  };

  store.users[user.username] = updated;
  await writeStore(store);
  return toPublicUser(updated);
}

export async function getLeaderboard() {
  const store = await readStore().catch(() => createEmptyStore());
  return store.leaderboard;
}

export async function recordScore(username: string, score: number) {
  const normalized = normalizeUsername(username);
  const store = await readStore();
  const user = store.users[normalized];

  if (!user) {
    throw new Error("user_not_found");
  }

  if (score <= user.bestScore) {
    const leaderboard = store.leaderboard;
    const rank =
      leaderboard.findIndex((entry) => entry.username === normalized) + 1 || null;

    return {
      accepted: false,
      bestScore: user.bestScore,
      rank,
      leaderboard,
      user: toPublicUser(user),
    };
  }

  const updatedAt = new Date().toISOString();
  const updatedUser: StoredUser = {
    ...user,
    bestScore: score,
  };
  const leaderboard = store.leaderboard;
  const nextEntry: LeaderboardEntry = {
    username: normalized,
    bestScore: score,
    updatedAt,
  };
  const nextLeaderboard = [...leaderboard.filter((entry) => entry.username !== normalized), nextEntry]
    .sort((left, right) => right.bestScore - left.bestScore)
    .slice(0, 12);

  store.users[normalized] = updatedUser;
  store.leaderboard = nextLeaderboard;
  await writeStore(store);

  return {
    accepted: true,
    bestScore: score,
    rank: nextLeaderboard.findIndex((entry) => entry.username === normalized) + 1,
    leaderboard: nextLeaderboard,
    user: toPublicUser(updatedUser),
  };
}
