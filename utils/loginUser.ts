"use client";

import { account, databases } from "@/lib/appwrite.client";
import { Query } from "appwrite";
import { toast } from "sonner";
import { DATABASE_ID, USER_ROLES_COLLECTION_ID } from "@/lib/constants";

if (!DATABASE_ID) throw new Error("Missing Appwrite database ID");

export async function loginUser(email: string, password: string) {
  try {
    await account.createEmailPasswordSession(email, password);
    const user = await account.get();
    console.log("✅ Logged in user ID:", user.$id);

    const roleDocs = await databases.listDocuments(DATABASE_ID, USER_ROLES_COLLECTION_ID, [
      Query.equal("userId", user.$id),
    ]);

    console.log("📦 Role documents returned:", roleDocs);

    if (roleDocs.total === 0) {
      console.error("❌ No UserRoles document found for user:", user.$id);
      throw new Error("No role assigned to this user.");
    }

    const role = roleDocs.documents[0]?.role;
    if (!role) {
      console.error("❌ Role field missing in UserRoles document:", roleDocs.documents[0]);
      throw new Error("User role document is missing the 'role' field.");
    }

    localStorage.setItem("userRole", role);
    localStorage.setItem("userId", user.$id);

    toast.success(`Welcome ${role}!`);
    return { role, user };

  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("❌ Login or role fetch failed:", err.message);
      toast.error(err.message || "Login failed.");
    } else {
      console.error("❌ Login or role fetch failed with non-error:", err);
      toast.error("Login failed.");
    }
    throw err;
  }
}
