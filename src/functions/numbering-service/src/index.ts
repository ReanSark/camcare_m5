import { getServerClient, COL, DB_ID } from "../shared/appwrite";
import { nextNumber, type Stream } from "../shared/numbering";
import type { Settings } from "../shared/types";
import { Query } from "node-appwrite";

/** ---- Open Runtimes request/response typing + helpers ---- */
interface FnContext {
  req: {
    body?: unknown;
    headers?: Record<string, string | string[]>;
  };
  res: {
    json(body: unknown, status?: number): void;
  };
}

function readJson<T = unknown>(ctx: FnContext): T {
  const b = ctx.req?.body;
  if (!b) return {} as T;
  if (typeof b === "string") {
    try { return JSON.parse(b) as T; } catch { return {} as T; }
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(b)) {
    try { return JSON.parse(b.toString("utf8")) as T; } catch { return {} as T; }
  }
  if (typeof b === "object") return b as T;
  return {} as T;
}

export default async function main(ctx: FnContext) {
  const { databases } = getServerClient();

  const { stream, dateISO } = readJson<{ stream?: string; dateISO?: string }>(ctx);
  if (!stream) {
    return ctx.res.json({ error: "stream required" }, 400);
  }

  const settingsList = await databases.listDocuments(DB_ID, COL.Settings, [Query.limit(1)]);
  const settings = settingsList.documents[0] as unknown as Settings;
  if (!settings) {
    return ctx.res.json({ error: "Settings not found" }, 500);
  }

  const out = await nextNumber(databases, settings, stream as Stream, dateISO);
  return ctx.res.json(out, 200);
}
