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
  const hasRedirected = useRef(false); // ✅ prevent multiple redirects

  useEffect(() => {
    if (loading || hasRedirected.current) return;

    const unauthorized =
      !user || !user.role || !allowedRoles.includes(user.role);

    if (unauthorized) {
      hasRedirected.current = true;
      router.replace("/403"); // ✅ use replace to prevent back nav
    }
  }, [user, loading, allowedRoles, router]);

  if (loading) return null;

  if (!user || !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}
