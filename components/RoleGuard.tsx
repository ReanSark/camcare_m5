"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (loading || hasRedirected.current) return;

    // 1. Not logged in? Go to login.
    if (!user) {
      hasRedirected.current = true;
      console.log("🔒 ROLEGUARD: Not authenticated, redirecting to /auth/login");
      router.replace("/auth/login");
      return;
    }

    // 2. Wrong role? Go to 403.
    if (!user.role || !allowedRoles.includes(user.role)) {
      hasRedirected.current = true;
      console.log(
        `⛔️ ROLEGUARD: Role '${user.role}' not allowed, redirecting to /403`
      );
      router.replace("/403");
      return;
    }
  }, [user, loading, allowedRoles, router]);

  if (loading) return null;
  if (!user || !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}
