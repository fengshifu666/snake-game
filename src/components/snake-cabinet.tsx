"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { LeaderboardEntry, PublicUser } from "@/lib/types";

type Direction = "up" | "down" | "left" | "right";
type Point = { x: number; y: number };
type GameStatus = "idle" | "running" | "paused" | "over";

type GameState = {
  snake: Point[];
  food: Point;
  direction: Direction;
  queuedDirection: Direction | null;
  score: number;
  status: GameStatus;
};

type ScoreResponse = {
  accepted: boolean;
  bestScore: number;
  rank: number | null;
  leaderboard: LeaderboardEntry[];
  user: PublicUser;
};

type SnakeCabinetProps = {
  user: PublicUser;
  onScoreCommitted: (payload: ScoreResponse) => void;
};

const BOARD_SIZE = 18;
const CELL_SIZE = 18;
const CANVAS_SIZE = BOARD_SIZE * CELL_SIZE;
const CONTROL_LABELS: Record<Direction, string> = {
  up: "上",
  down: "下",
  left: "左",
  right: "右",
};

function isOpposite(left: Direction, right: Direction) {
  return (
    (left === "up" && right === "down") ||
    (left === "down" && right === "up") ||
    (left === "left" && right === "right") ||
    (left === "right" && right === "left")
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function createFood(snake: Point[]) {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
  const available: Point[] = [];

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        available.push({ x, y });
      }
    }
  }

  return available[Math.floor(Math.random() * available.length)] ?? { x: 6, y: 6 };
}

function createGameState(): GameState {
  const snake = [
    { x: 9, y: 9 },
    { x: 8, y: 9 },
    { x: 7, y: 9 },
  ];

  return {
    snake,
    food: createFood(snake),
    direction: "right",
    queuedDirection: null,
    score: 0,
    status: "idle",
  };
}

function nextHead(head: Point, direction: Direction) {
  if (direction === "up") {
    return { x: head.x, y: head.y - 1 };
  }

  if (direction === "down") {
    return { x: head.x, y: head.y + 1 };
  }

  if (direction === "left") {
    return { x: head.x - 1, y: head.y };
  }

  return { x: head.x + 1, y: head.y };
}

function advanceGame(game: GameState): GameState {
  const direction =
    game.queuedDirection && !isOpposite(game.direction, game.queuedDirection)
      ? game.queuedDirection
      : game.direction;
  const head = nextHead(game.snake[0], direction);
  const hitsWall =
    head.x < 0 || head.x >= BOARD_SIZE || head.y < 0 || head.y >= BOARD_SIZE;
  const hitsSelf = game.snake.some(
    (segment) => segment.x === head.x && segment.y === head.y,
  );

  if (hitsWall || hitsSelf) {
    return {
      ...game,
      direction,
      queuedDirection: null,
      status: "over",
    };
  }

  const ateFood = head.x === game.food.x && head.y === game.food.y;
  const snake = ateFood
    ? [head, ...game.snake]
    : [head, ...game.snake.slice(0, game.snake.length - 1)];

  return {
    snake,
    food: ateFood ? createFood(snake) : game.food,
    direction,
    queuedDirection: null,
    score: ateFood ? game.score + 10 : game.score,
    status: "running",
  };
}

function drawGame(ctx: CanvasRenderingContext2D, game: GameState) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.fillStyle = "#05070c";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#0c1320" : "#08101b";
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
    }
  }

  const foodX = game.food.x * CELL_SIZE;
  const foodY = game.food.y * CELL_SIZE;
  const pulse = 2 + ((game.score / 10) % 3) * 0.35;
  ctx.shadowColor = "#f59e0b";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.arc(foodX + CELL_SIZE / 2, foodY + CELL_SIZE / 2, 4 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  ctx.arc(foodX + CELL_SIZE / 2, foodY + CELL_SIZE / 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  game.snake.forEach((segment, index) => {
    const x = segment.x * CELL_SIZE + 2;
    const y = segment.y * CELL_SIZE + 2;
    const size = CELL_SIZE - 4;

    ctx.fillStyle = index === 0 ? "#f8fafc" : "#2dd4bf";
    roundRect(ctx, x, y, size, size, index === 0 ? 7 : 6);

    if (index === 0) {
      ctx.fillStyle = "#0f172a";
      const eyeX1 =
        game.direction === "left" ? x + 4 : game.direction === "right" ? x + 10 : x + 5;
      const eyeY1 =
        game.direction === "up" ? y + 4 : game.direction === "down" ? y + 10 : y + 5;
      const eyeX2 =
        game.direction === "up" || game.direction === "down" ? eyeX1 + 4 : eyeX1;
      const eyeY2 =
        game.direction === "left" || game.direction === "right" ? eyeY1 + 4 : eyeY1;

      ctx.beginPath();
      ctx.arc(eyeX1, eyeY1, 1.3, 0, Math.PI * 2);
      ctx.arc(eyeX2, eyeY2, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function SnakeCabinet({ user, onScoreCommitted }: SnakeCabinetProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const submittedScoresRef = useRef<Set<number>>(new Set());
  const [game, setGame] = useState<GameState>(() => createGameState());
  const [hint, setHint] = useState("点击开始或使用方向键，碰撞后本局结束。");
  const [submitting, setSubmitting] = useState(false);
  const [latestBest, setLatestBest] = useState(user.bestScore);
  const effectiveBest = Math.max(latestBest, user.bestScore);
  const speed = Math.max(90, 220 - (game.snake.length - 3) * 7);
  const statusLabel =
    game.status === "running"
      ? "进行中"
      : game.status === "paused"
        ? "已暂停"
        : game.status === "over"
          ? "已结束"
          : "待开始";
  const statusMessage =
    submitting && game.score > 0
      ? "正在同步当前最高分..."
      : game.status === "over"
        ? "本局结束，重新开始后可继续挑战更高分。"
        : hint;

  function startGame(direction?: Direction) {
    submittedScoresRef.current.clear();
    const next = createGameState();
    setGame({
      ...next,
      direction: direction ?? next.direction,
      status: "running",
    });
    setHint("当你打出新的个人最高分时，系统会立刻同步到排行榜。");
  }

  function queueDirection(direction: Direction) {
    setGame((current) => {
      if (current.status === "idle" || current.status === "over") {
        const next = createGameState();
        return {
          ...next,
          direction,
          status: "running",
        };
      }

      if (isOpposite(current.direction, direction) || current.queuedDirection === direction) {
        return current;
      }

      return {
        ...current,
        queuedDirection: direction,
      };
    });
  }

  function togglePause() {
    setGame((current) => {
      if (current.status === "running") {
        return { ...current, status: "paused" };
      }

      if (current.status === "paused") {
        return { ...current, status: "running" };
      }

      return current;
    });
  }

  const syncScore = useEffectEvent(async (score: number) => {
    if (score <= effectiveBest || submittedScoresRef.current.has(score)) {
      return;
    }

    submittedScoresRef.current.add(score);
    setSubmitting(true);

    try {
      const response = await fetch("/api/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ score }),
      });
      const payload = (await response.json()) as ScoreResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "分数提交失败");
      }

      setLatestBest((current) => Math.max(current, payload.bestScore));
      setHint(
        payload.accepted
          ? `新纪录已同步，当前排名第 ${payload.rank}。`
          : "当前分数尚未超过你的历史最佳。",
      );
      onScoreCommitted(payload);
    } catch (error) {
      submittedScoresRef.current.delete(score);
      setHint(error instanceof Error ? error.message : "分数提交失败");
    } finally {
      setSubmitting(false);
    }
  });

  const tick = useEffectEvent(() => {
    let nextScore = 0;

    setGame((current) => {
      if (current.status !== "running") {
        return current;
      }

      const next = advanceGame(current);
      nextScore = next.score;
      return next;
    });

    if (nextScore > effectiveBest) {
      void syncScore(nextScore);
    }
  });

  const handleKeyboard = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === " ") {
      event.preventDefault();
      togglePause();
      return;
    }

    const mapping: Record<string, Direction> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
    };
    const direction = mapping[event.key];

    if (direction) {
      event.preventDefault();
      queueDirection(direction);
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  useEffect(() => {
    if (game.status !== "running") {
      return;
    }

    const timer = window.setInterval(() => tick(), speed);
    return () => window.clearInterval(timer);
  }, [game.status, speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    drawGame(context, game);
  }, [game]);

  return (
    <section className="surface-card game-card">
      <div className="section-head tight">
        <div>
          <p className="eyebrow">Game Room</p>
        </div>
        <div className="status-pill">状态：{statusLabel}</div>
      </div>

      <div className="game-layout game-layout-tight">
        <div className="game-board-wrap">
          <div className="game-frame">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="game-canvas mx-auto w-full max-w-[680px] rounded-[24px] border border-white/6 bg-[#050912]"
            />
          </div>
        </div>

        <div className="game-sidebar">
          <div className="stats-stack">
            <div className="metric-card">
              <span>玩家</span>
              <strong>{user.username}</strong>
            </div>
            <div className="metric-card emphasis">
              <span>当前分数</span>
              <strong>{game.score}</strong>
            </div>
            <div className="metric-card">
              <span>历史最高</span>
              <strong>{effectiveBest}</strong>
            </div>
            <div className="metric-card">
              <span>移动速度</span>
              <strong>{Math.round(1000 / speed)} Hz</strong>
            </div>
          </div>

          <div className="message-card">
            <p className="text-sm leading-7 text-slate-300">{statusMessage}</p>
          </div>

          <div className="action-row">
            <button className="primary-button flex-1" type="button" onClick={() => startGame()}>
              开始新局
            </button>
            <button className="secondary-button flex-1" type="button" onClick={togglePause}>
              {game.status === "paused" ? "继续" : "暂停"}
            </button>
          </div>

          <div className="control-panel">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-100">方向控制</p>
              <span className="text-xs text-slate-500">支持键盘与点击</span>
            </div>
            <div className="mobile-dpad mt-4 grid grid-cols-3 gap-2">
              <span />
              <button className="control-button" type="button" onClick={() => queueDirection("up")}>
                {CONTROL_LABELS.up}
              </button>
              <span />
              <button className="control-button" type="button" onClick={() => queueDirection("left")}>
                {CONTROL_LABELS.left}
              </button>
              <button className="control-button" type="button" onClick={() => queueDirection("down")}>
                {CONTROL_LABELS.down}
              </button>
              <button className="control-button" type="button" onClick={() => queueDirection("right")}>
                {CONTROL_LABELS.right}
              </button>
            </div>
          </div>

          <div className="message-card muted">
            <p className="text-sm leading-7 text-slate-400">
              使用方向键或 WASD 控制移动，空格键暂停。手机上也可以直接点击按钮操作，新的个人最好分会立即写入排行榜。
            </p>
          </div>
        </div>
      </div>

      <div className="mobile-gamepad">
        <div className="mobile-gamepad-grid">
          <span />
          <button className="control-button mobile-control-button" type="button" onClick={() => queueDirection("up")}>
            {CONTROL_LABELS.up}
          </button>
          <span />
          <button className="control-button mobile-control-button" type="button" onClick={() => queueDirection("left")}>
            {CONTROL_LABELS.left}
          </button>
          <button className="control-button mobile-control-button" type="button" onClick={() => queueDirection("down")}>
            {CONTROL_LABELS.down}
          </button>
          <button className="control-button mobile-control-button" type="button" onClick={() => queueDirection("right")}>
            {CONTROL_LABELS.right}
          </button>
        </div>
      </div>
    </section>
  );
}
