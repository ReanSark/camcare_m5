import { Databases } from "node-appwrite";
import type { Settings, Sequence } from "./types";
import { COL, DB_ID } from "./appwrite";

export type Stream = "invoice" | "dispense" | "labOrder" | "accession" | "imagingOrder";

type SequenceDoc = Sequence & { $id: string };

function pad(num: number, len: number) {
  return String(num).padStart(len, "0");
}

function buildKey(stream: Stream, dt: Date, settings: Settings) {
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");

  let scope: "global" | "monthly" | "yearly" = "global";
  let prefix = "";
  let padLen = 6;

  switch (stream) {
    case "invoice":
      prefix = settings.invoicePrefix;
      scope = settings.invoiceResetScope;
      padLen = settings.invoicePad;
      break;
    case "dispense":
      prefix = settings.dispensePrefix;
      scope =
        settings.dispenseResetScope === "never"
          ? "global"
          : settings.dispenseResetScope === "year"
          ? "yearly"
          : "monthly";
      padLen = settings.dispensePad;
      break;
    case "labOrder":
      prefix = settings.labOrderPrefix;
      scope =
        settings.labOrderResetScope === "never"
          ? "global"
          : settings.labOrderResetScope === "year"
          ? "yearly"
          : "monthly";
      padLen = settings.labOrderPad;
      break;
    case "accession":
      prefix = settings.accessionPrefix;
      scope =
        settings.accessionResetScope === "never"
          ? "global"
          : settings.accessionResetScope === "year"
          ? "yearly"
          : "monthly";
      padLen = settings.accessionPad;
      break;
    case "imagingOrder":
      prefix = settings.imagingOrderPrefix;
      scope =
        settings.imagingOrderResetScope === "never"
          ? "global"
          : settings.imagingOrderResetScope === "year"
          ? "yearly"
          : "monthly";
      padLen = settings.imagingOrderPad;
      break;
  }

  const parts = [prefix];
  if (scope === "monthly") parts.push(`${yyyy}${mm}`);
  if (scope === "yearly") parts.push(`${yyyy}`);
  const key = parts.join(":");
  return { key, padLen, prefix };
}

export async function nextNumber(
  databases: Databases,
  settings: Settings,
  stream: Stream,
  whenISO?: string
): Promise<{ number: string; key: string; current: number }> {
  const now = whenISO ? new Date(whenISO) : new Date();
  const { key, padLen, prefix } = buildKey(stream, now, settings);

  // Use a sanitized ID based on the scope key
  const seqId = key.replace(/[^A-Za-z0-9:_-]/g, "_");

  // Attempt "read-or-create" then increment
  let current = 0;
  try {
    const doc = (await databases.getDocument(
      DB_ID,
      COL.Sequences,
      seqId
    )) as unknown as SequenceDoc;
    current = typeof doc.current === "number" ? doc.current : 0;
  } catch {
    // create with current = 0 if missing
    await databases.createDocument(DB_ID, COL.Sequences, seqId, { key, current: 0 });
    current = 0;
  }

  // Short retry loop to reduce race conditions
  const attempts = settings.collisionPolicy === "fail" ? 1 : 5;
  for (let i = 0; i < attempts; i++) {
    try {
      const newCur = current + 1;
      await databases.updateDocument(DB_ID, COL.Sequences, seqId, { current: newCur });
      const human = `${prefix}-${pad(newCur, padLen)}`;
      return { number: human, key, current: newCur };
    } catch {
      // small backoff and re-read current
      await new Promise<void>((resolve) => setTimeout(resolve, 25 * (i + 1)));
      const doc = (await databases.getDocument(
        DB_ID,
        COL.Sequences,
        seqId
      )) as unknown as SequenceDoc;
      current = typeof doc.current === "number" ? doc.current : 0;
    }
  }
  throw new Error("Sequence collision: retries exhausted");
}
