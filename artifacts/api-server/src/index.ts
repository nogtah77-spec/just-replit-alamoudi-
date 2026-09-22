import app from "./app";
import { logger } from "./lib/logger";
import { seedDatabase, normalizeFinishingValues } from "./lib/seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// In production, SESSION_SECRET must be explicitly configured.
// Without it, every session can be forged by anyone who knows the fallback string.
if (process.env.REPLIT_DEPLOYMENT && !process.env.SESSION_SECRET) {
  logger.error("SESSION_SECRET must be set in production. Set it as a Replit secret before deploying.");
  process.exit(1);
}

// Apply schema + seed BEFORE accepting any requests.
// This ensures a fresh database is fully provisioned on every startup and
// prevents early requests from racing an incomplete database state.
// If provisioning fails, the process exits rather than serving a broken API.
try {
  await seedDatabase();
  await normalizeFinishingValues();
} catch (err) {
  logger.error({ err }, "Database provisioning failed — cannot start server");
  process.exit(1);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
