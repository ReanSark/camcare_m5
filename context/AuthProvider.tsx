// This component handles user session validation and provides user context to the entire app.
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { account, databases, DATABASE_ID } from "@/lib/appwrite.config";
import { Query } from "appwrite";
import { COLLECTIONS } from "@/lib/collections";

// User type exposed through context
interface User {
  id: string;
  $id: string; // ✅ added
  email: string;
  name: string;
  role: string;
}

// Context type for consumers (e.g. RoleGuard, DashboardLayout)
interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

// Default context value
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {}, // 👈 Add this
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔍 Main logic to check session and resolve user role
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

      // 🔎 Role collections to scan for this user
      const roles = [
        COLLECTIONS.RECEPTIONISTS,
        COLLECTIONS.DOCTORS,
        COLLECTIONS.PHARMACISTS,
        COLLECTIONS.LABTECHNICIANS
      ];

      console.log("📄 AUTH: Using collection IDs from env:", {
        mvp_receptionists: COLLECTIONS.RECEPTIONISTS,
        mvp_doctors: COLLECTIONS.DOCTORS,
        mvp_pharmacists: COLLECTIONS.PHARMACISTS,
        mvp_labTechnicians: COLLECTIONS.LABTECHNICIANS,
      });

      // 🌀 Search for user in role collections
      for (const collection of roles) {
        console.log(`📦 AUTH: Checking user in collection: ${collection}`);

        try {
          const res = await databases.listDocuments(
            DATABASE_ID,
            collection,
            [Query.equal("userId", userId)]
          );

          console.log(`📑 AUTH: Query result for ${collection}:`, res);

          if (res.total > 0) {
            const doc = res.documents[0];

            console.log("✅ AUTH: User found in collection:", collection, doc);

            setUser({
              id: userId,
              $id: doc.$id, // ✅ added
              email: doc.email ?? "",
              name: doc.fullName ?? "",
              role: doc.role,
            });

            return; // 🛑 Stop once role is found
          }
        } catch (collectionError) {
          console.warn(`❌ AUTH: Error querying ${collection}:`, collectionError);
        }
      }

      // 🚫 No role found
      console.log("⚠️ AUTH: No matching role document found.");
      setUser(null);
    } catch (err) {
      console.error("❌ AUTH: Failed to fetch session/user:", err);
      setUser(null);
    } finally {
      console.log("🔚 AUTH: Done checking auth state.");
      setLoading(false);
    }
  };

  // 🔄 Runs only once on mount
  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// 👇 Hook for other components to access auth state
export const useAuth = () => useContext(AuthContext);
