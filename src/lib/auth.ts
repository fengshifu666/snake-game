import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "snake_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "snake-demo-session-secret-change-me";

type SessionPayload = {
  u: string;
  exp: number;
};

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value: string) {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [salt, expectedHash] = passwordHash.split(":");

  if (!salt || !expectedHash) {
    return false;
  }

  const actualHash = pbkdf2Sync(password, salt, 120000, 64, "sha512").toString(
    "hex",
  );

  return timingSafeEqual(
    Buffer.from(actualHash, "utf8"),
    Buffer.from(expectedHash, "utf8"),
  );
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export async function createSession(username: string) {
  const store = await cookies();
  const payload: SessionPayload = {
    u: username,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = signValue(encoded);

  store.set(SESSION_COOKIE, `${encoded}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(payload.exp),
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUsername() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  const [encoded, signature] = raw.split(".");

  if (!encoded || !signature || signValue(encoded) !== signature) {
    return null;
  }

  const payload = JSON.parse(fromBase64Url(encoded)) as SessionPayload;

  if (!payload.exp || payload.exp < Date.now()) {
    return null;
  }

  return payload.u;
}
