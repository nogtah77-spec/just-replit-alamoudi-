import express, { type Express } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { sessionMiddleware } from "./lib/auth";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "70mb" }));
app.use(express.urlencoded({ extended: true, limit: "70mb" }));
app.use(sessionMiddleware);

// CSRF defense: state-changing requests must originate from the same site.
// Browsers always attach an Origin header on cross-site requests, so an
// attacker's forged request will carry their origin and be rejected.
app.use((req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    next();
    return;
  }
  const origin = req.get("origin");
  if (!origin) {
    next();
    return;
  }
  const host = req.get("x-forwarded-host") || req.get("host");
  try {
    if (host && new URL(origin).host === host) {
      next();
      return;
    }
  } catch {
    /* malformed origin -> reject below */
  }
  res.status(403).json({ error: "cross-origin request blocked" });
});

app.use("/api", router);

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(
    {
      err,
      method: req.method,
      url: req.originalUrl,
    },
    "Unhandled API request error",
  );

  if (req.originalUrl.startsWith("/api/")) {
    res.status(500).json({
      error: "تعذّر تنفيذ طلب API. تحقق من اتصال قاعدة البيانات وإعدادات الجلسة.",
    });
    return;
  }

  next(err);
});

export default app;
