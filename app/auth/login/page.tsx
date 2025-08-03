"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { account, databases, DATABASE_ID } from "@/lib/appwrite.config";
import { getDashboardPath } from "@/utils/redirectByRole";
import { Query } from "appwrite";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await account.createEmailPasswordSession(email, password);
      const sessionUser = await account.get();
      const userId = sessionUser.$id;

      // Fetch role (from one of the role-specific collections)
      const roles = ["Receptionists", "Doctors", "Pharmacists", "LabTechnicians"];
      let userRole = "";

      for (const collection of roles) {
        const res = await databases.listDocuments(
          DATABASE_ID, // replace with your DB ID
          collection,
          [Query.equal("userId", userId)]
        );
        if (res.total > 0) {
          userRole = res.documents[0].role;
          break;
        }
      }

      if (!userRole) {
        setError("Role not assigned.");
        return;
      }

      router.push(getDashboardPath(userRole));
    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError("Login failed.");
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
