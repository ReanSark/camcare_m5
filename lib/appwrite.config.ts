// lib/appwrite.config.ts
import { Client, Account, Databases, Storage, ID } from "appwrite";

// ✅ Initialize Appwrite client
const client = new Client();

// ✅ Set endpoint and project using environment variables
client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!) // e.g., https://syd.cloud.appwrite.io/v1
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!); // Your project ID

// ✅ Defensive validation: only runs during development
if (process.env.NODE_ENV === "development") {
  if (!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || !process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) {
    throw new Error("❌ Missing Appwrite ENV configuration. Check .env.local for endpoint or project ID.");
  }

  if (!process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID) {
    throw new Error("❌ Missing Appwrite DATABASE_ID in .env.local");
  }
}

// ✅ Export commonly used Appwrite services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// ✅ Convenience alias to generate unique document IDs
export const IDGen = ID;

// ✅ Database ID pulled from .env.local
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

