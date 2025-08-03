// contexts/AuthProvider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { account, databases, DATABASE_ID, } from "@/lib/appwrite.config";
import { Models, Query } from "appwrite";
import { COLLECTIONS } from "@/lib/collections";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

const fetchUser = async () => {
  try {
    console.log("🔍 AUTH: Checking session via account.getSession()");
    const session = await account.getSession("current");

    if (!session || !session.userId) {
      console.log("⚠️ AUTH: No session found. User is not logged in.");
      setUser(null);
      return;
    }

    console.log("✅ AUTH: Session found:", session);

    const userId = session.userId;

    const roles = [
      COLLECTIONS.RECEPTIONISTS,
      COLLECTIONS.DOCTORS,
      COLLECTIONS.PHARMACISTS,
      COLLECTIONS.LABTECHNICIANS
    ];
    console.log("AUTH: Loaded collection IDs:", {
      mvp_receptionists: COLLECTIONS.RECEPTIONISTS,
      mvp_doctors: COLLECTIONS.DOCTORS,
      mvp_pharmacists: COLLECTIONS.PHARMACISTS,
      mvp_labTechnicians: COLLECTIONS.LABTECHNICIANS,
    });

    for (const collection of roles) {
      console.log(`📦 AUTH: Checking user in collection: ${collection}`);

      try {
        const res = await databases.listDocuments(
          DATABASE_ID,
          collection,
          [Query.equal("userId", userId)]
        );

        if (res.total > 0) {
          const doc = res.documents[0];
          console.log("✅ AUTH: User found in:", collection, doc);

          setUser({
            id: userId,
            email: doc.email ?? "",
            name: doc.fullName ?? "",
            role: doc.role,
          });

          return;
        }
      } catch (collectionError) {
        console.warn(`❌ AUTH: Error querying ${collection}:`, collectionError);
        // Don't throw — continue to next collection
      }
    }

    console.log("⚠️ AUTH: No matching role document found.");
    setUser(null);
  } catch (err) {
    console.error("❌ AUTH: Auth fetch error:", err);
    setUser(null);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchUser();
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
