// lib/appwriteServer.ts
import "server-only";
import { Client, Databases, Storage, Users, ID } from "node-appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!); // server key

export const databases = new Databases(client);
export const storage = new Storage(client);
export const users = new Users(client);
export const IDHelper = ID;
