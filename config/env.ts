// config/env.ts
// SDK-free env constants usable by both client and server code.

export const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
export const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const FILES_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_FILES_BUCKET_ID!;

if (process.env.NODE_ENV === "development") {
  if (!APPWRITE_ENDPOINT) throw new Error("Missing NEXT_PUBLIC_APPWRITE_ENDPOINT");
  if (!APPWRITE_PROJECT_ID) throw new Error("Missing NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  if (!DATABASE_ID) throw new Error("Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID");
  if (!FILES_BUCKET_ID) throw new Error("Missing NEXT_PUBLIC_APPWRITE_FILES_BUCKET_ID");
}
