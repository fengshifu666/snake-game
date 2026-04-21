export type LeaderboardEntry = {
  username: string;
  bestScore: number;
  updatedAt: string;
};

export type PublicUser = {
  username: string;
  createdAt: string;
  bestScore: number;
  lastLoginAt: string;
};

export type StoredUser = PublicUser & {
  passwordHash: string;
};

export type StoreData = {
  users: Record<string, StoredUser>;
  leaderboard: LeaderboardEntry[];
};
