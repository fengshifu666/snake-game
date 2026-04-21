"use client";

import { useState } from "react";
import { SnakeCabinet } from "@/components/snake-cabinet";
import type { LeaderboardEntry, PublicUser } from "@/lib/types";

type HomeShellProps = {
  initialLeaderboard: LeaderboardEntry[];
  initialUser: PublicUser | null;
};

type AuthMode = "login" | "register";

export function HomeShell({
  initialLeaderboard,
  initialUser,
}: HomeShellProps) {
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [user, setUser] = useState(initialUser);
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(
    initialUser ? "继续冲榜吧。" : "登录后即可参与全站排行榜。",
  );
  const [pending, setPending] = useState(false);

  async function submitAuth(nextMode: AuthMode) {
    setPending(true);
    setMessage(nextMode === "login" ? "正在登录..." : "正在创建账号...");

    try {
      const response = await fetch(`/api/auth/${nextMode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      const payload = (await response.json()) as {
        error?: string;
        user?: PublicUser;
      };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? "请求失败");
      }

      setUser(payload.user);
      setUsername("");
      setPassword("");
      setMessage(nextMode === "login" ? "登录成功，开始游戏。" : "注册完成，开始冲榜。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "请求失败");
    } finally {
      setPending(false);
    }
  }

  async function handleLogout() {
    setPending(true);
    setMessage("正在退出...");

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setMessage("已退出，登录后可继续冲榜。");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <section className="hero-grid">
        <div className="panel relative overflow-hidden">
          <div className="absolute -right-10 top-8 h-40 w-40 rounded-full bg-amber-400/18 blur-3xl" />
          <div className="absolute -left-12 bottom-2 h-44 w-44 rounded-full bg-cyan-300/12 blur-3xl" />
          <p className="relative text-xs uppercase tracking-[0.34em] text-cyan-200/65">
            Snake Rush Arena
          </p>
          <h1 className="relative mt-4 max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
            会登录、能冲榜、可公开访问的网页版贪吃蛇。
          </h1>
          <p className="relative mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            这是一个偏街机厅气质的单页应用：注册账号后开始闯关，系统会自动记录你的历史最高分，并把最强玩家展示在全站排行榜里。
          </p>

          <div className="relative mt-7 flex flex-wrap gap-3">
            <div className="stat-chip">
              <span>全站排行</span>
              <strong>{leaderboard.length || 0} 人上榜</strong>
            </div>
            <div className="stat-chip">
              <span>游戏规则</span>
              <strong>吃到能量块 +10</strong>
            </div>
            <div className="stat-chip">
              <span>操作方式</span>
              <strong>方向键 / WASD</strong>
            </div>
          </div>
        </div>

        <aside className="panel flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-cyan-200/65">
                Account
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {user ? `你好，${user.username}` : mode === "login" ? "玩家登录" : "注册新玩家"}
              </h2>
            </div>
            {user ? (
              <button className="ghost-button" onClick={handleLogout} disabled={pending}>
                退出
              </button>
            ) : (
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                <button
                  className={mode === "login" ? "toggle-chip-active" : "toggle-chip"}
                  onClick={() => setMode("login")}
                  type="button"
                >
                  登录
                </button>
                <button
                  className={mode === "register" ? "toggle-chip-active" : "toggle-chip"}
                  onClick={() => setMode("register")}
                  type="button"
                >
                  注册
                </button>
              </div>
            )}
          </div>

          {user ? (
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="hud-card">
                  <span>历史最高</span>
                  <strong>{user.bestScore}</strong>
                </div>
                <div className="hud-card">
                  <span>最近登录</span>
                  <strong>{new Date(user.lastLoginAt).toLocaleDateString("zh-CN")}</strong>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">{message}</p>
            </div>
          ) : (
            <form
              className="rounded-[24px] border border-white/10 bg-white/6 p-5"
              onSubmit={(event) => {
                event.preventDefault();
                void submitAuth(mode);
              }}
            >
              <label className="field-label" htmlFor="username">
                用户名
              </label>
              <input
                id="username"
                className="field-input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="仅限字母、数字、下划线"
              />

              <label className="field-label mt-4" htmlFor="password">
                密码
              </label>
              <input
                id="password"
                className="field-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="6 位以上"
              />

              <button className="action-button mt-5 w-full" disabled={pending} type="submit">
                {pending ? "处理中..." : mode === "login" ? "立即登录" : "创建账号"}
              </button>

              <p className="mt-4 text-sm leading-7 text-slate-300">{message}</p>
            </form>
          )}

          <div className="rounded-[24px] border border-white/10 bg-[#091220] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.34em] text-cyan-200/65">
                  Leaderboard
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">全站排行榜</h3>
              </div>
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 font-mono text-sm text-amber-200">
                TOP 12
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {leaderboard.length > 0 ? (
                leaderboard.map((entry, index) => (
                  <div key={entry.username} className="leaderboard-row">
                    <div className="flex items-center gap-3">
                      <span className="rank-dot">{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <p className="text-sm text-slate-100">{entry.username}</p>
                        <p className="text-xs text-cyan-100/50">
                          {new Date(entry.updatedAt).toLocaleDateString("zh-CN")}
                        </p>
                      </div>
                    </div>
                    <strong className="font-mono text-lg text-amber-300">
                      {entry.bestScore}
                    </strong>
                  </div>
                ))
              ) : (
                <p className="rounded-[20px] border border-dashed border-white/10 px-4 py-5 text-sm leading-7 text-slate-300">
                  现在还没有玩家上榜。注册后玩一局，你就是第一名。
                </p>
              )}
            </div>
          </div>
        </aside>
      </section>

      {user ? (
        <SnakeCabinet
          user={user}
          onScoreCommitted={(payload) => {
            setUser(payload.user);
            setLeaderboard(payload.leaderboard);
          }}
        />
      ) : (
        <section className="panel border-dashed border-white/12 bg-white/4 text-center">
          <p className="text-xs uppercase tracking-[0.34em] text-cyan-200/65">
            Game Access
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">登录后解锁游戏机</h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-8 text-slate-300">
            当前版本把注册、登录与排行榜都接到真实的服务端存储里，因此需要先创建账号，才能提交分数并进入公开排名。
          </p>
        </section>
      )}
    </main>
  );
}
