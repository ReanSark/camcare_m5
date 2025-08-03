// "use client";

// import { account, databases } from "@/lib/appwrite.client";
// import { Query } from "appwrite";
// import { toast } from "sonner";
// import { DATABASE_ID, USER_ROLES_COLLECTION_ID } from "@/lib/constants";

// if (!DATABASE_ID) throw new Error("Missing Appwrite database ID");

// export async function loginUser(email: string, password: string) {
//   try {
//     // 🚫 Clear any existing session
//     try {
//       await account.deleteSession("current");
//     } catch (cleanupErr) {
//       console.warn("No session to delete:", cleanupErr);
//     }

//     // 🔐 Create new session
//     await account.createEmailPasswordSession(email, password);

//     // 👤 Get current user
//     const user = await account.get();
//     // DEBUG CODE BELOW
//     // console.log("✅ Logged in user ID:", user.$id);

//     // 🎯 Fetch role
//     const roleDocs = await databases.listDocuments(DATABASE_ID, USER_ROLES_COLLECTION_ID, [
//       Query.equal("userId", user.$id),
//     ]);

//     console.log("📦 Role documents returned:", roleDocs);

//     if (roleDocs.total === 0) {
//       throw new Error(`No role assigned to user ${user.$id}.`);
//     }

//     const role = roleDocs.documents[0]?.role;
//     if (!role) {
//       throw new Error("User role document is missing the 'role' field.");
//     }

//     // 💾 Cache
//     localStorage.setItem("userRole", role);
//     localStorage.setItem("userId", user.$id);

//     toast.success(`Welcome ${role}!`);
//     return { role, user };

//   } catch (err: unknown) {
//     if (err instanceof Error) {
//       console.error("❌ Login or role fetch failed:", err.message);
//       toast.error(err.message || "Login failed.");
//     } else {
//       console.error("❌ Login error (non-standard):", err);
//       toast.error("Login failed.");
//     }
//     throw err;
//   }
// }
