"use client";

import { useEffect, useState } from "react";
import { SnakeCabinet } from "@/components/snake-cabinet";
import type { LeaderboardEntry, PublicUser } from "@/lib/types";

type HomeShellProps = {
  initialLeaderboard: LeaderboardEntry[];
  initialUser: PublicUser | null;
};

type AuthMode = "login" | "register";

type LeaderboardResponse = {
  leaderboard: LeaderboardEntry[];
};

function formatSyncTime(value: string | null) {
  if (!value) {
    return "等待同步";
  }

  return `更新于 ${new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

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
    initialUser ? "继续开始下一局，排行榜会自动同步。" : "登录后即可参与排行榜。",
  );
  const [pending, setPending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    initialLeaderboard.length > 0 ? new Date().toISOString() : null,
  );

  useEffect(() => {
    let active = true;

    async function refreshLeaderboard() {
      setSyncing(true);

      try {
        const response = await fetch("/api/leaderboard", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("排行榜同步失败");
        }

        const payload = (await response.json()) as LeaderboardResponse;

        if (!active) {
          return;
        }

        setLeaderboard(payload.leaderboard);
        setLastSyncedAt(new Date().toISOString());
        setUser((current) => {
          if (!current) {
            return current;
          }

          const latestEntry = payload.leaderboard.find(
            (entry) => entry.username === current.username,
          );

          if (!latestEntry || latestEntry.bestScore <= current.bestScore) {
            return current;
          }

          return {
            ...current,
            bestScore: latestEntry.bestScore,
          };
        });
      } catch {
        if (active) {
          setLastSyncedAt(null);
        }
      } finally {
        if (active) {
          setSyncing(false);
        }
      }
    }

    void refreshLeaderboard();
    const timer = window.setInterval(() => {
      void refreshLeaderboard();
    }, 5000);
    const handleFocus = () => {
      void refreshLeaderboard();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

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
      setMessage(nextMode === "login" ? "登录成功，可以开始游戏了。" : "注册成功，准备冲榜。");
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
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      setUser(null);
      setMessage("已退出登录。");
    } finally {
      setPending(false);
    }
  }

  async function manualRefresh() {
    setSyncing(true);

    try {
      const response = await fetch("/api/leaderboard", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("排行榜同步失败");
      }

      const payload = (await response.json()) as LeaderboardResponse;
      setLeaderboard(payload.leaderboard);
      setLastSyncedAt(new Date().toISOString());
    } catch {
      setLastSyncedAt(null);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div className="mobile-toolbar">
        <button
          className="secondary-button mobile-toolbar-button"
          type="button"
          onClick={() => setMobilePanelOpen(true)}
        >
          排行榜与账号
        </button>
      </div>

      <section className="app-shell">
        <div className="main-stage">
          {user ? (
            <SnakeCabinet
              user={user}
              onScoreCommitted={(payload) => {
                setUser(payload.user);
                setLeaderboard(payload.leaderboard);
                setLastSyncedAt(new Date().toISOString());
              }}
            />
          ) : (
            <section className="surface-card">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Play</p>
                  <h1 className="section-title">登录后开始游戏</h1>
                </div>
                <div className="status-pill">记录全站排行榜</div>
              </div>

              <div className="empty-stage">
                <div className="empty-stage-grid">
                  <div className="preview-card">
                    <span>游戏规则</span>
                    <strong>吃到果实 +10 分</strong>
                    <p>撞墙或撞到自己时结束，系统会自动保存你的历史最佳成绩。</p>
                  </div>
                  <div className="preview-card">
                    <span>同步方式</span>
                    <strong>实时写入榜单</strong>
                    <p>当你打出新的个人最高分时，会立刻提交，不必等到刷新页面。</p>
                  </div>
                  <div className="preview-card">
                    <span>操作方式</span>
                    <strong>键盘或点击</strong>
                    <p>支持方向键、WASD 和屏幕按钮，桌面和移动端都能玩。</p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className={`side-rail ${mobilePanelOpen ? "side-rail-open" : ""}`}>
          <div
            className="mobile-drawer-backdrop"
            onClick={() => setMobilePanelOpen(false)}
          />
          <div className="mobile-drawer">
            <div className="mobile-drawer-head">
              <p className="eyebrow">Panel</p>
              <button
                className="secondary-button mobile-toolbar-button"
                type="button"
                onClick={() => setMobilePanelOpen(false)}
              >
                关闭
              </button>
            </div>

          <section className="surface-card compact-card">
            <div className="section-head tight">
              <div>
                <p className="eyebrow">Status</p>
                <h2 className="panel-title">当前状态</h2>
              </div>
            </div>

            <div className="stats-stack">
              <div className="info-tile">
                <span>当前上榜</span>
                <strong>{leaderboard.length}</strong>
              </div>
              <div className="info-tile">
                <span>同步状态</span>
                <strong>{syncing ? "同步中" : "已连接"}</strong>
              </div>
              <div className="info-tile">
                <span>操作方式</span>
                <strong>方向键 / WASD</strong>
              </div>
            </div>
          </section>

          <section className="surface-card compact-card">
            <div className="section-head tight">
              <div>
                <p className="eyebrow">Account</p>
                <h2 className="panel-title">
                  {user ? `你好，${user.username}` : mode === "login" ? "玩家登录" : "注册账号"}
                </h2>
              </div>
              {user ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={handleLogout}
                  disabled={pending}
                >
                  退出
                </button>
              ) : (
                <div className="mode-toggle">
                  <button
                    className={mode === "login" ? "mode-toggle-active" : "mode-toggle-button"}
                    type="button"
                    onClick={() => setMode("login")}
                  >
                    登录
                  </button>
                  <button
                    className={mode === "register" ? "mode-toggle-active" : "mode-toggle-button"}
                    type="button"
                    onClick={() => setMode("register")}
                  >
                    注册
                  </button>
                </div>
              )}
            </div>

            {user ? (
              <div className="stats-stack mt-5">
                <div className="metric-card">
                  <span>历史最高</span>
                  <strong>{user.bestScore}</strong>
                </div>
                <div className="metric-card">
                  <span>最近登录</span>
                  <strong>{new Date(user.lastLoginAt).toLocaleDateString("zh-CN")}</strong>
                </div>
              </div>
            ) : (
              <form
                className="mt-5 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitAuth(mode);
                }}
              >
                <div>
                  <label className="field-label" htmlFor="username">
                    用户名
                  </label>
                  <input
                    id="username"
                    className="field-input"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="3-16 位字母、数字或下划线"
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="password">
                    密码
                  </label>
                  <input
                    id="password"
                    className="field-input"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="6-32 位"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                </div>
                <button className="primary-button w-full" disabled={pending} type="submit">
                  {pending ? "处理中..." : mode === "login" ? "登录" : "创建账号"}
                </button>
              </form>
            )}

            <p className="side-note">{message}</p>
          </section>

          <section className="surface-card compact-card">
            <div className="section-head tight">
              <div>
                <p className="eyebrow">Leaderboard</p>
                <h2 className="panel-title">实时排行榜</h2>
              </div>
              <button className="secondary-button" type="button" onClick={() => void manualRefresh()}>
                刷新
              </button>
            </div>

            <div className="sync-strip">
              <span>{formatSyncTime(lastSyncedAt)}</span>
              <span>{syncing ? "自动同步中" : "5 秒轮询"}</span>
            </div>

            <div className="leaderboard-stack">
              {leaderboard.length > 0 ? (
                leaderboard.map((entry, index) => (
                  <div key={entry.username} className="leaderboard-item">
                    <div className="flex items-center gap-4">
                      <span className="leaderboard-rank">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-100">{entry.username}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(entry.updatedAt).toLocaleString("zh-CN")}
                        </p>
                      </div>
                    </div>
                    <strong className="font-mono text-lg text-amber-200">{entry.bestScore}</strong>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  还没有玩家上榜。完成一局游戏后，这里会自动出现最新成绩。
                </div>
              )}
            </div>
          </section>
          </div>
        </aside>
      </section>
    </main>
  );
}
