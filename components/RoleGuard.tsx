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
    if (!loading && (!user || !allowedRoles.includes(user.role))) {
      router.push("/auth/login");
    }
  }, [user, loading, allowedRoles, router]);

  if (loading || !user) return null;

  return <>{children}</>;
}
