// lib/appwriteServer.ts
import "server-only";
import { Client, Databases, Storage, Users, ID } from "node-appwrite";
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from "@/config/env";

const API_KEY = process.env.APPWRITE_API_KEY!;
if (process.env.NODE_ENV === "development") {
  if (!API_KEY) throw new Error("Missing APPWRITE_API_KEY (server key)");
}

const serverClient = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(API_KEY);

export const databases = new Databases(serverClient);
export const storage = new Storage(serverClient);
export const users = new Users(serverClient);
export const IDHelper = ID;
