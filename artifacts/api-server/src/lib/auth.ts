import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { db, pool, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "express";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    role?: string;
    userName?: string;
  }
}

const PgSession = connectPgSimple(session);

// In production (HTTPS) we need Secure + SameSite=None so the cookie travels
// across the Replit proxy. In development the workflow runs over plain HTTP,
// so Secure must be false and SameSite must be lax — otherwise browsers
// silently discard the cookie and every request appears unauthenticated.
const isProduction = process.env.NODE_ENV === "production" || !!process.env.REPLIT_DEPLOYMENT;

export const sessionMiddleware: RequestHandler = session({
  store: new PgSession({
    pool,
    createTableIfMissing: true,
    tableName: "session",
  }),
  secret: process.env.SESSION_SECRET || "alamoudi-dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  },
});

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(pw, hash);
  } catch {
    return false;
  }
}

async function getActiveSessionUser(req: Parameters<RequestHandler>[0]) {
  if (!req.session?.userId) return null;
  const [user] = await db
    .select({
      id: usersTable.id,
      role: usersTable.role,
      active: usersTable.active,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId))
    .limit(1);

  if (!user?.active || (user.role !== "admin" && user.role !== "agent")) return null;

  // Refresh role data for sessions created before role-based checks were added
  // or after an administrator changed the user's role.
  req.session.role = user.role;
  return user;
}

/** Allows both admin and agent roles. The role is read from the database so
 * stale sessions cannot make a valid staff account appear unauthorized. */
export const requireStaff: RequestHandler = async (req, res, next) => {
  if (await getActiveSessionUser(req)) {
    next();
    return;
  }
  res.status(401).json({ error: "unauthorized" });
};

/** Restricts to admin role only. Use for user/role management and other
 * privileged operations that agents must not access. */
export const requireAdmin: RequestHandler = async (req, res, next) => {
  const user = await getActiveSessionUser(req);
  if (user?.role === "admin") {
    next();
    return;
  }
  res.status(403).json({ error: "forbidden" });
};

/** Allows admins and explicitly delegated staff to clear activity logs. */
export const requireActivityLogClear: RequestHandler = async (req, res, next) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  let user: {
    role: string;
    active: boolean;
    canClearActivityLogs?: boolean;
  } | undefined;
  try {
    [user] = await db
      .select({
        role: usersTable.role,
        active: usersTable.active,
        canClearActivityLogs: usersTable.canClearActivityLogs,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.session.userId))
      .limit(1);
  } catch (error) {
    const isMissingPermissionColumn =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "42703";
    if (!isMissingPermissionColumn) throw error;
    [user] = await db
      .select({
        role: usersTable.role,
        active: usersTable.active,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.session.userId))
      .limit(1);
  }

  if (
    user?.active &&
    (user.role === "admin" || (user.role === "agent" && user.canClearActivityLogs))
  ) {
    next();
    return;
  }
  res.status(403).json({ error: "forbidden" });
};
