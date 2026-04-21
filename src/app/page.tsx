import { unstable_noStore as noStore } from "next/cache";
import { HomeShell } from "@/components/home-shell";
import { getSessionUsername } from "@/lib/auth";
import { getLeaderboard, getPublicUser } from "@/lib/data";

export default async function Home() {
  noStore();
  const [username, leaderboard] = await Promise.all([
    getSessionUsername(),
    getLeaderboard(),
  ]);
  const user = username ? await getPublicUser(username) : null;

  return <HomeShell initialLeaderboard={leaderboard} initialUser={user} />;
}
