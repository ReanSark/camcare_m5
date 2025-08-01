"use client";

import { account, databases } from "@/lib/appwrite.client";
import { Query } from "appwrite";
import { toast } from "sonner";

export async function loginUser(email: string, password: string) {
  try {
    // Start session
    await account.createEmailPasswordSession(email, password);

    // Get user info
    const user = await account.get();

    // Get role from DB
    const roleDocs = await databases.listDocuments("camcare_db", "UserRoles", [
      Query.equal("userId", user.$id),
    ]);

    const role = roleDocs.documents?.[0]?.role;

    if (!role) throw new Error("No role assigned to this user.");

    // Cache role locally
    localStorage.setItem("userRole", role);
    localStorage.setItem("userId", user.$id);

    // Optional toast
    toast.success(`Welcome ${role}!`);

    return { role, user };
  } catch (err) {
    toast.error("Login failed.");
    throw err;
  }
}
