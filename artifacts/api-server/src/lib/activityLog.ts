import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { db, activityLogsTable } from "@workspace/db";

type LogEntry = {
  action: string;
  entityType: string;
  title: string;
  actor?: string;
};

export function actorFromReq(req: Request): string {
  if (req.session?.userId) {
    const name = req.session.userName ? ` (${req.session.userName})` : "";
    return req.session.role === "agent" ? `موظف${name}` : `الإدارة${name}`;
  }
  return "زائر";
}

export async function logActivity(entry: LogEntry): Promise<void> {
  try {
    await db.insert(activityLogsTable).values({
      id: randomUUID(),
      action: entry.action,
      entityType: entry.entityType,
      title: entry.title,
      actor: entry.actor ?? "",
      createdAt: new Date().toISOString(),
    });
  } catch {
    /* logging must never break the underlying operation */
  }
}
