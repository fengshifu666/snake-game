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
const DIRECTION_ORDER: Direction[] = ["up", "left", "down", "right"];
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

function drawGame(ctx: CanvasRenderingContext2D, game: GameState, bestScore: number) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.fillStyle = "#08111e";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#102239" : "#0c1b2f";
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
    }
  }

  ctx.fillStyle = "#ffd166";
  ctx.shadowColor = "#ffd166";
  ctx.shadowBlur = 10;
  ctx.fillRect(
    game.food.x * CELL_SIZE + 3,
    game.food.y * CELL_SIZE + 3,
    CELL_SIZE - 6,
    CELL_SIZE - 6,
  );

  ctx.shadowBlur = 0;
  game.snake.forEach((segment, index) => {
    ctx.fillStyle = index === 0 ? "#78f1cb" : "#1fcf9c";
    ctx.fillRect(
      segment.x * CELL_SIZE + 2,
      segment.y * CELL_SIZE + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4,
    );
  });

  ctx.fillStyle = "rgba(5, 10, 18, 0.78)";
  ctx.fillRect(12, 12, 134, 42);
  ctx.fillStyle = "#eff7f3";
  ctx.font = "600 12px var(--font-mono)";
  ctx.fillText(`SCORE ${game.score}`, 22, 30);
  ctx.fillText(`BEST  ${bestScore}`, 22, 48);
}

export function SnakeCabinet({ user, onScoreCommitted }: SnakeCabinetProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const submittedRef = useRef(false);
  const [game, setGame] = useState<GameState>(() => createGameState());
  const [hint, setHint] = useState("按方向键或按钮开始，撞墙即结束。");
  const [submitting, setSubmitting] = useState(false);
  const speed = Math.max(80, 220 - (game.snake.length - 3) * 7);
  const statusMessage =
    game.status === "over"
      ? "游戏结束，重新开始可继续冲榜。"
      : submitting
        ? "正在提交分数..."
        : hint;

  function startGame(direction?: Direction) {
    submittedRef.current = false;
    const next = createGameState();
    setGame({
      ...next,
      direction: direction ?? next.direction,
      status: "running",
    });
    setHint("吃掉金色能量块，分数会自动提交到排行榜。");
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
        status: current.status === "paused" ? "running" : current.status,
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

  const submitScore = useEffectEvent(async (score: number) => {
    if (submittedRef.current || score <= 0) {
      return;
    }

    submittedRef.current = true;
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

      setHint(
        payload.accepted
          ? `新纪录已保存，当前排名第 ${payload.rank}。`
          : "本次分数未超过你的历史最佳。",
      );
      onScoreCommitted(payload);
    } catch (error) {
      setHint(error instanceof Error ? error.message : "分数提交失败");
    } finally {
      setSubmitting(false);
    }
  });

  const tick = useEffectEvent(() => {
    let finishedScore = 0;

    setGame((current) => {
      if (current.status !== "running") {
        return current;
      }

      const next = advanceGame(current);

      if (next.status === "over") {
        finishedScore = next.score;
      }

      return next;
    });

    if (finishedScore > 0) {
      setHint("游戏结束，正在提交分数...");
      void submitScore(finishedScore);
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

    drawGame(context, game, user.bestScore);
  }, [game, user.bestScore]);

  return (
    <section className="panel flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
            Arcade Station
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {user.username} 的蛇机
          </h2>
        </div>
        <div className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-right">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/55">
            Best
          </p>
          <p className="font-mono text-xl text-amber-300">{user.bestScore}</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[28px] border border-white/12 bg-[#050c15] p-4 shadow-[0_28px_70px_rgba(3,9,18,0.45)]">
        <div className="absolute inset-x-8 top-3 h-10 rounded-full bg-cyan-300/10 blur-2xl" />
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="relative mx-auto w-full max-w-[420px] rounded-[24px] border border-white/8 bg-[#07111d]"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/55">
            Status
          </p>
          <p className="mt-2 text-sm text-slate-200">{statusMessage}</p>
        </div>
        <div className="flex gap-2">
          <button className="action-button" onClick={() => startGame()}>
            新开一局
          </button>
          <button className="ghost-button" onClick={() => togglePause()}>
            {game.status === "paused" ? "继续" : "暂停"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 self-center">
        <span />
        <button className="control-key" onClick={() => queueDirection("up")}>
          {CONTROL_LABELS.up}
        </button>
        <span />
        <button className="control-key" onClick={() => queueDirection("left")}>
          {CONTROL_LABELS.left}
        </button>
        <button className="control-key" onClick={() => queueDirection("down")}>
          {CONTROL_LABELS.down}
        </button>
        <button className="control-key" onClick={() => queueDirection("right")}>
          {CONTROL_LABELS.right}
        </button>
      </div>

      <div className="rounded-[22px] border border-white/10 bg-[#091220] px-4 py-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/55">
            Controls
          </p>
          <p className="font-mono text-sm text-cyan-100/70">
            {DIRECTION_ORDER.map((direction) => CONTROL_LABELS[direction]).join(" / ")}
          </p>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          键盘支持方向键与 WASD，空格键暂停。每吃到一个能量块得 10 分。
        </p>
      </div>
    </section>
  );
}
