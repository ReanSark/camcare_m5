// components/AuthGuard.tsx
"use client";

import { useAuth } from "@/context/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      console.log("⏳ AUTHGUARD: Waiting for auth state...");
      return;
    }
    if (!user) {
      console.log("⛔️ AUTHGUARD: User not authenticated, redirecting to /auth/login");
      router.replace("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    console.log("⏳ AUTHGUARD: Still loading auth state, rendering nothing.");
    return null; // Or a spinner
  }

  if (!user) {
    console.log("⛔️ AUTHGUARD: Not authenticated, render blocked.");
    return null; // Prevents children render during redirect
  }

  return <>{children}</>;
}
