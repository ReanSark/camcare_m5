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
  const key = parts.join("-"); // ← use hyphen for the sequence key
  return { key, padLen, prefix };
}

// Appwrite docId rules: <=36 chars, allowed [A-Za-z0-9._-], must start alphanumeric.
const isValidDocId = (s: string) => /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/.test(s);

export async function nextNumber(
  databases: Databases,
  settings: Settings,
  stream: Stream,
  whenISO?: string
): Promise<{ number: string; key: string; current: number }> {
  const now = whenISO ? new Date(whenISO) : new Date();
  const { key, padLen, prefix } = buildKey(stream, now, settings);

  // Document ID == key (your requirement)
  const docId = key;

  if (!isValidDocId(docId)) {
    throw new Error(
      `Invalid sequence key '${key}' for Appwrite documentId. Keep it <=36 chars, start with a letter/number, and use only letters, numbers, '.', '_' or '-'. Consider shortening the prefix.`
    );
  }

  // read-or-create
  let current = 0;
  try {
    const doc = (await databases.getDocument(
      DB_ID,
      COL.Sequences,
      docId
    )) as unknown as SequenceDoc;
    current = typeof doc.current === "number" ? doc.current : 0;
  } catch {
    await databases.createDocument(DB_ID, COL.Sequences, docId, { key, current: 0 });
    current = 0;
  }

  // short retry loop
  const attempts = settings.collisionPolicy === "fail" ? 1 : 5;
  for (let i = 0; i < attempts; i++) {
    try {
      const newCur = current + 1;
      await databases.updateDocument(DB_ID, COL.Sequences, docId, { current: newCur });
      const human = `${prefix}-${pad(newCur, padLen)}`; // e.g. INV-000123
      return { number: human, key, current: newCur };
    } catch {
      await new Promise<void>((resolve) => setTimeout(resolve, 25 * (i + 1)));
      const doc = (await databases.getDocument(
        DB_ID,
        COL.Sequences,
        docId
      )) as unknown as SequenceDoc;
      current = typeof doc.current === "number" ? doc.current : 0;
    }
  }
  throw new Error("Sequence collision: retries exhausted");
}
