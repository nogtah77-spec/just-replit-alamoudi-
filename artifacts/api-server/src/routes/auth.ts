import { Router, type IRouter } from "express";
import { eq, or, and, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { verifyPassword } from "../lib/auth";
import { logActivity } from "../lib/activityLog";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function publicUser(u: {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  active: boolean;
  canClearActivityLogs: boolean;
  joinedAt: string;
}) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    role: u.role,
    active: u.active,
    canClearActivityLogs: u.role === "admin" || u.canClearActivityLogs,
    joinedAt: u.joinedAt,
  };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    const identifier = String(req.body?.identifier ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    if (!identifier || !password) {
      res.status(400).json({ error: "يرجى إدخال اسم المستخدم وكلمة المرور" });
      return;
    }
    const rows = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      username: usersTable.username,
      passwordHash: usersTable.passwordHash,
      role: usersTable.role,
      active: usersTable.active,
      joinedAt: usersTable.joinedAt,
    }).from(usersTable).where(
      or(
        sql`lower(${usersTable.username}) = ${identifier}`,
        sql`lower(${usersTable.email}) = ${identifier}`,
      ),
    );
    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      return;
    }
    if (!user.active) {
      res.status(403).json({ error: "هذا الحساب غير مفعّل. تواصل مع الإدارة." });
      return;
    }
    if (user.role !== "admin" && user.role !== "agent") {
      res.status(403).json({ error: "هذه الصفحة مخصّصة للإدارة والموظفين فقط" });
      return;
    }
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.userName = user.name;
    void logActivity({
      action: "login",
      entityType: "auth",
      title: `تسجيل الدخول إلى لوحة التحكم: ${user.name}`,
      actor: user.role === "agent" ? `موظف (${user.name})` : `الإدارة (${user.name})`,
    });
    // Persist the session before responding so the first authenticated mutation
    // after login cannot race the session store and arrive as a 401.
    req.session.save((saveError) => {
      if (saveError) {
        logger.error({ err: saveError }, "Could not persist login session");
        res.status(500).json({ error: "تعذّر حفظ جلسة الدخول. تحقق من اتصال قاعدة البيانات وجدول session." });
        return;
      }
    res.json(publicUser({ ...user, canClearActivityLogs: false }));
    });
  } catch (err) {
    logger.error({ err }, "Login request failed");
    res.status(500).json({ error: "تعذّر تنفيذ تسجيل الدخول. تحقق من إعداد قاعدة البيانات في بيئة النشر." });
  }
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const name = req.session?.userName ?? "";
  const role = req.session?.role ?? "";
  void logActivity({
    action: "logout",
    entityType: "auth",
    title: `تسجيل الخروج: ${name || "مستخدم"}`,
    actor: role === "agent" ? `موظف (${name})` : `الإدارة (${name})`,
  });
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session?.userId) {
    res.json(null);
    return;
  }
  const rows = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    username: usersTable.username,
    role: usersTable.role,
    active: usersTable.active,
    joinedAt: usersTable.joinedAt,
  }).from(usersTable).where(
    and(
      eq(usersTable.id, req.session.userId as string),
      eq(usersTable.active, true),
    ),
  );
  const user = rows[0];
  if (!user) {
    res.json(null);
    return;
  }
  // Keep long-lived sessions compatible with role checks after deployments
  // or role changes. The current database record is authoritative.
  req.session.role = user.role;
  req.session.userName = user.name;
  res.json(publicUser({ ...user, canClearActivityLogs: false }));
});

export default router;
