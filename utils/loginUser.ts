
"use client";

import { account, databases } from "@/lib/appwrite.config";
import { Query } from "appwrite";

export const loginUser = async (email: string, password: string) => {
  
  await account.createEmailPasswordSession(email, password);

  const user = await account.get();

  const roleDocs = await databases.listDocuments("camcare_db", "UserRoles", [
    Query.equal("userId", user.$id)
  ]);

  const role = roleDocs.documents[0]?.role;

  return { user, role };
};
