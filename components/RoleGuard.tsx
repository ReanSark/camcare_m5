"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type RoleGuardProps = {
  allowedRoles: string[];
  children: React.ReactNode;
};

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // ⏳ wait until auth check finishes

    if (!user) {
      console.warn("🔐 No session — redirecting to login");
      router.push("/auth/login");
    } else if (!role || !allowedRoles.includes(role)) {
      console.warn(`🚫 Unauthorized role "${role}" — redirecting to /403`);
      router.push("/403");
    }
  }, [user, role, loading, router, allowedRoles]);

  const isAuthorized = !!user && !!role && allowedRoles.includes(role);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600">
        Loading session...
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // or return a fallback UI if needed
  }

  return <>{children}</>;
}
