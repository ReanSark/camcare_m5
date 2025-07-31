"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useEffect } from "react";
import { account, databases } from "@/lib/appwrite.client";
import { Query, Models } from "appwrite";

type AuthContextType = {
  user: Models.User<Models.Preferences> | null;
  role: string | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUser = async () => {
    try {
      const acc = await account.get(); // type: Models.User<Models.Preferences>
      const roleDocs = await databases.listDocuments("camcare_db", "UserRoles", [
        Query.equal("userId", acc.$id),
      ]);
      setUser(acc);
      setRole(roleDocs.documents[0]?.role ?? null);
    } catch {
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await account.deleteSession("current");
      setUser(null);
      setRole(null);
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
