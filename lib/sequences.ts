// lib/sequences.ts
import "server-only";
import { databases } from "@/lib/appwriteServer";
import { DATABASE_ID } from "@/config/env";
import { COLLECTIONS } from "@/lib/collections";
import type { Settings } from "@/types";

function pad(num: number, size: number): string {
  return String(num).padStart(size, "0");
}

function tokens(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return { YYYY: `${y}`, YYYYMM: `${y}${m}`, YYYYMMDD: `${y}${m}${d}` };
}

function prefixFromFormat(format: string, date: Date): string {
  // Replace date tokens, keep trailing separator before #### if present
  const t = tokens(date);
  let out = format.replace("YYYYMMDD", t.YYYYMMDD).replace("YYYYMM", t.YYYYMM).replace("YYYY", t.YYYY);
  out = out.replace("####", ""); // strip counter placeholder
  // Ensure single trailing separator, if any existed
  if (!/[-_/]$/.test(out)) out += "-";
  return out;
}

function sequenceKeyFromFormat(format: string, date: Date): string {
  const t = tokens(date);
  const  out = format.replace("####", "").replace("YYYYMMDD", t.YYYYMMDD).replace("YYYYMM", t.YYYYMM).replace("YYYY", t.YYYY);
  // remove trailing separators
  return out.replace(/[-_/]+$/, "");
}

export async function getNextInvoiceNo(settings: Settings, when: Date = new Date()): Promise<string> {
  const zeroPad = settings.zeroPad ?? 4;
  const fmt = settings.numberFormat ?? "INV-YYYYMM-####";

  const prefix = prefixFromFormat(fmt, when); // e.g., "INV-202508-"
  const key = sequenceKeyFromFormat(fmt, when); // e.g., "INV-202508"

  // Ensure a sequence doc exists (docId = key)
  type SeqDoc = { $id: string; key: string; current: number };
  let seq: SeqDoc;

  try {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.SEQUENCES, key);
    seq = doc as unknown as SeqDoc;
  } catch {
    const created = await databases.createDocument(DATABASE_ID, COLLECTIONS.SEQUENCES, key, { key, current: 0 });
    seq = created as unknown as SeqDoc;
  }

  // Optimistic increment with small retry
  for (let i = 0; i < 5; i++) {
    const next = (seq.current ?? 0) + 1;
    try {
      const updated = await databases.updateDocument(DATABASE_ID, COLLECTIONS.SEQUENCES, key, { current: next });
      const num = pad(next, zeroPad);
      return `${prefix}${num}`;
    } catch {
      const fresh = await databases.getDocument(DATABASE_ID, COLLECTIONS.SEQUENCES, key);
      seq = fresh as unknown as SeqDoc;
    }
  }

  throw new Error("Failed to increment invoice sequence after retries");
}
