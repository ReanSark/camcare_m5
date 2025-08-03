// components/RoleGuard.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/403"); // safer fallback
      } else if (!allowedRoles.includes(user.role)) {
        router.push("/403");
      }
    }
  }, [user, loading, allowedRoles, router]);

  // Still waiting for session to resolve
  if (loading) return null;

  // Prevent showing anything while redirecting
  if (!user || !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}
