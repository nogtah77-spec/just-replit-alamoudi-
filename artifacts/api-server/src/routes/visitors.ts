import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, visitorPingsTable } from "@workspace/db";
import { requireStaff } from "../lib/auth";

const router: IRouter = Router();

const TZ = "Africa/Cairo";

// Public heartbeat: a visitor's browser pings this roughly once a minute while
// the tab is open. Each ping is an append-only row used to derive visitor stats.
router.post("/track/heartbeat", async (req, res): Promise<void> => {
  const raw = (req.body as { visitorId?: unknown })?.visitorId;
  const visitorId = typeof raw === "string" ? raw.trim().slice(0, 100) : "";
  if (!visitorId) {
    res.sendStatus(204);
    return;
  }
  try {
    await db.insert(visitorPingsTable).values({ visitorId });
    // Opportunistic pruning so the append-only log stays bounded.
    if (Math.random() < 0.02) {
      await db.execute(
        sql`DELETE FROM visitor_pings WHERE created_at < now() - interval '31 days'`,
      );
    }
  } catch (err) {
    req.log.warn({ err }, "failed to record visitor heartbeat");
  }
  res.sendStatus(204);
});

// Staff-only aggregated visitor stats.
router.get("/visitors/stats", requireStaff, async (_req, res): Promise<void> => {
  const result = await db.execute<{
    online: string;
    today: string;
    week: string;
    month: string;
  }>(sql`
    SELECT
      COUNT(DISTINCT visitor_id) FILTER (
        WHERE created_at >= now() - interval '2 minutes'
      ) AS online,
      COUNT(DISTINCT visitor_id) FILTER (
        WHERE created_at >= date_trunc('day', now() AT TIME ZONE ${TZ}) AT TIME ZONE ${TZ}
      ) AS today,
      COUNT(DISTINCT visitor_id) FILTER (
        WHERE created_at >= now() - interval '7 days'
      ) AS week,
      COUNT(DISTINCT visitor_id) FILTER (
        WHERE created_at >= now() - interval '30 days'
      ) AS month
    FROM visitor_pings
  `);
  const row = result.rows[0] ?? { online: "0", today: "0", week: "0", month: "0" };
  res.json({
    online: Number(row.online) || 0,
    today: Number(row.today) || 0,
    week: Number(row.week) || 0,
    month: Number(row.month) || 0,
  });
});

export default router;
