import { cookies } from "next/headers";
import argon2 from "argon2";
import { db } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export { SESSION_COOKIE_NAME };
export const PASSWORD_MIN_LENGTH = 10;
const FAILURE_WINDOW_MS = 10 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

const failureMap = new Map<string, { count: number; firstFailureAt: number }>();

export function getCurrentUserId() {
  const sessionId = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  return db.session
    .findUnique({
      where: { id: sessionId },
      select: { userId: true, expiresAt: true },
    })
    .then((session) => {
      if (!session || session.expiresAt.getTime() <= Date.now()) {
        return null;
      }
      return session.userId;
    });
}

export async function requireUser() {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("UNAUTHENTICATED");
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    throw new Error("USER_DISABLED");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function hashPassword(password: string) {
  return argon2.hash(password);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return argon2.verify(passwordHash, password);
}

export function recordFailedAttempt(identifier: string) {
  const now = Date.now();
  const entry = failureMap.get(identifier) ?? { count: 0, firstFailureAt: now };
  if (now - entry.firstFailureAt > FAILURE_WINDOW_MS) {
    entry.count = 0;
    entry.firstFailureAt = now;
  }

  entry.count += 1;
  failureMap.set(identifier, entry);

  if (entry.count >= MAX_FAILURES) {
    return { lockedUntil: now + LOCKOUT_MS };
  }

  return { lockedUntil: null };
}

export function clearFailedAttempts(identifier: string) {
  failureMap.delete(identifier);
}

export function isLocked(identifier: string) {
  const entry = failureMap.get(identifier);
  if (!entry) return false;
  if (Date.now() - entry.firstFailureAt > FAILURE_WINDOW_MS) {
    failureMap.delete(identifier);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

export async function invalidateUserSessions(userId: string) {
  await db.session.deleteMany({ where: { userId } });
}

export async function createSessionForUser(userId: string, expiresAt: Date) {
  return db.session.create({
    data: { userId, expiresAt },
  });
}
