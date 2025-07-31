"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { account, databases } from "@/lib/appwrite.config";
import { Query, Models } from "appwrite";

type AuthContextType = {
  user: Models.User<Models.Preferences> | null;
  role: string | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
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

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
