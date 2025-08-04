"use client";

import { useAuth } from "@/context/AuthProvider";
import { account } from "@/lib/appwrite.config";
import { useRouter } from "next/navigation";

export const useLogout = () => {
  const router = useRouter();
  const { setUser } = useAuth();

  const logout = async () => {
    try {
      await account.deleteSession("current");
      setUser(null);
      console.log("🔒 User logged out");

      router.push("/auth/login");
    } catch (error) {
      console.error("❌ Logout failed:", error);
    }
  };

  return logout;
};
