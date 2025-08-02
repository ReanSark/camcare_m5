import { databases } from "@/lib/appwrite.server";
import { Query } from "appwrite";

const DB_ID = "camcare_db";

export async function getUserRole(userId: string): Promise<string | null> {
  const result = await databases.listDocuments(DB_ID, "UserRoles", [
    Query.equal("userId", userId),
  ]);
  return result.documents[0]?.role || null;
}

export async function getRoleProfile(userId: string, role: string) {
  const collectionId = role + "s"; // e.g., Doctor → Doctors
  const result = await databases.listDocuments(DB_ID, collectionId, [
    Query.equal("userId", userId),
  ]);
  return result.documents[0] || null;
}
