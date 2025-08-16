import { getServerClient, COL, DB_ID } from "../shared/appwrite";
import { nextNumber, type Stream } from "../shared/numbering";
import type { Settings } from "../shared/types";
import { Query } from "node-appwrite";

// Minimal types to satisfy lint/TS without external deps
interface HeadersLike {
  get(name: string): string | null;
}
interface RequestLike {
  json(): Promise<unknown>;
  headers: HeadersLike;
}
interface ResponseLike {
  json(body: unknown, status?: number): void;
}
interface FnContext {
  req: RequestLike;
  res: ResponseLike;
}

export default async function main(ctx: FnContext) {
  const { databases } = getServerClient();

  const raw = await ctx.req.json();
  const { stream, dateISO } = (raw ?? {}) as { stream?: string; dateISO?: string };

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
