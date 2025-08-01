// lib/constants.ts

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const USER_ROLES_COLLECTION_ID = "688ada1e0038a453acc3";

// Optional: Throw early if misconfigured (for development only)
if (!DATABASE_ID) throw new Error("Missing Appwrite database ID");


