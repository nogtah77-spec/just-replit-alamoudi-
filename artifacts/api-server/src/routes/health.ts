import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (req, res): Promise<void> => {
  if (req.query.deep !== "1") {
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
    return;
  }

  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'session')
      ORDER BY table_name
    `);
    const tables = result.rows.map((row) => row.table_name as string);
    const missing = ["users", "session"].filter((name) => !tables.includes(name));

    if (missing.length > 0) {
      res.status(503).json({
        status: "error",
        code: "missing_database_tables",
        missingTables: missing,
      });
      return;
    }

    res.json({
      status: "ok",
      code: "database_ready",
      tables,
    });
  } catch {
    res.status(503).json({
      status: "error",
      code: "database_unreachable",
    });
  }
});

export default router;
