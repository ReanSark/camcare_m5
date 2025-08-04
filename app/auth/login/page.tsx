"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { account, databases, DATABASE_ID } from "@/lib/appwrite.config";
import { getDashboardPath } from "@/utils/redirectByRole";
import { Query } from "appwrite";
import { useAuth } from "@/context/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { user, loading } = useAuth();

    // 🔄 Check if user already logged in and redirect if so
  useEffect(() => {
    if (loading) {
      console.log("⏳ LOGINPAGE: Waiting for auth loading...");
      return;
    }
    if (user) {
      const dashboardPath = `/dashboard/${user.role.toLowerCase()}`;
      console.log("➡️ LOGINPAGE: User is already logged in, redirecting to:", dashboardPath);
      router.replace(dashboardPath);
    }
  }, [loading, user, router]);

  if (loading) {
    console.log("⏳ LOGINPAGE: Still loading auth state, rendering nothing.");
    return null; // Or a spinner
  }

  if (user) {
    console.log("⏩ LOGINPAGE: User found, already redirecting...");
    return null; // Prevents login form render during redirect
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    console.log("🚀 LOGINPAGE: Login form submitted");

    try {
      // 🔐 Optional cleanup: delete session before creating a new one
      try {
        await account.deleteSession("current");
        console.log("🧹 LOGINPAGE: Previous session cleared");
      } catch (cleanupError) {
        console.warn("⚠️ LOGINPAGE: No session to delete:", cleanupError);
      }

      // 1. 🔐 Login with Appwrite
      await account.createEmailPasswordSession(email, password);
      console.log("✅ LOGINPAGE: Login session created");

      // Optional: short pause to allow cookies to propagate
      await new Promise((res) => setTimeout(res, 1000));

      // Hard reload to ensure session is available to AuthProvider
      // window.location.href = "/dashboard/receptionist";

      // 2. 👤 Get session user data
      const sessionUser = await account.get();
      const userId = sessionUser.$id;
      console.log("👤 LOGINPAGE: Fetched session user:", sessionUser);

      // 3. 🔍 Find the user’s role from specific MVP collections
      const roles = [
        process.env.NEXT_PUBLIC_MVP_RECEPTIONISTS_COLLECTION_ID!,
        process.env.NEXT_PUBLIC_MVP_DOCTORS_COLLECTION_ID!,
        process.env.NEXT_PUBLIC_MVP_PHARMACISTS_COLLECTION_ID!,
        process.env.NEXT_PUBLIC_MVP_LABTECHNICIANS_COLLECTION_ID!
      ];

      let userRole = "";

      for (const collectionId of roles) {
        console.log("📦 LOGINPAGE: Checking user in collection:", collectionId);

        try {
          const res = await databases.listDocuments(
            DATABASE_ID,
            collectionId,
            [Query.equal("userId", userId)]
          );
          console.log(`📄 LOGINPAGE: Query result from ${collectionId}:`, res);

          if (res.total > 0) {
            userRole = res.documents[0].role;
            console.log("✅ LOGINPAGE: Role found:", userRole);
            break;
          }
        } catch (queryError) {
          console.error("❌ LOGINPAGE: Error querying collection:", collectionId, queryError);
        }
      }

      if (!userRole) {
        setError("LOGINPAGE: Role not assigned. Contact admin.");
        console.warn("⚠️ LOGINPAGE: No role found for user.");
        return;
      }

      // 4. 🚀 Redirect to role-specific dashboard
      const dashboardPath = getDashboardPath(userRole);
      console.log("📍 LOGINPAGE: Redirecting to:", dashboardPath);
      window.location.href = dashboardPath;
    } catch (err) {
      console.error("❌ LOGINPAGE: Login failed:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("LOGINPAGE: Login failed.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleLogin} className="w-full max-w-md bg-white shadow p-6 rounded space-y-4">
        <h1 className="text-xl font-bold text-center">Please Login</h1>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">
          Login
        </button>
      </form>
    </div>
  );
}
