// contexts/AuthProvider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { account, databases } from "@/lib/appwrite.config";
import { Models, Query } from "appwrite";

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
      const session = await account.get();
      const userId = session.$id;

      const roles = ["Receptionists", "Doctors", "Pharmacists", "LabTechnicians"];
      let userRole = "";

      for (const collection of roles) {
        const res = await databases.listDocuments(
          "camcare-db", // change this to your actual database ID
          collection,
          [Query.equal("userId", userId)]
        );

        if (res.total > 0) {
          userRole = res.documents[0].role;
          break;
        }
      }

      if (!userRole) {
        setUser(null);
      } else {
        setUser({
          id: userId,
          email: session.email,
          name: session.name,
          role: userRole,
        });
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);// 🛑 Only mark complete here
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
