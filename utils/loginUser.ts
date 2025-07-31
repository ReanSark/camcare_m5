
"use client";

import { account, databases } from "@/lib/appwrite.config";
import { Query } from "appwrite";

export const loginUser = async (email: string, password: string) => {

  /* Try this later for the failed login issue*/
  // try {
  // await account.createEmailPasswordSession(email, password);
  // const user = await account.get();

  // console.log("User:", user);

  // const roleDocs = await databases.listDocuments("camcare_db", "UserRoles", [
  //   Query.equal("userId", user.$id),
  // ]);

  // const role = roleDocs.documents[0]?.role;
  // console.log("Role:", role);

  // // redirect logic...
  // } catch (err: any) {
  //   console.error("Full login error object:", err);
  //   alert(err.message || "Login failed.");
  // }

  
  await account.createEmailPasswordSession(email, password);
  const user = await account.get();

  const roleDocs = await databases.listDocuments("camcare_db", "UserRoles", [
    Query.equal("userId", user.$id)
  ]);

  const role = roleDocs.documents[0]?.role;

  return { user, role };
};
