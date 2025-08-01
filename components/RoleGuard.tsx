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
    if (!loading) {
      if (!user) {
        router.push("/auth/login");
      } else if (!role || !allowedRoles.includes(role)) {
        router.push("/403");
      }
    }
  }, [user, role, loading, router, allowedRoles]);

  const isAuthorized = !!user && !!role && allowedRoles.includes(role);

  if (loading || !isAuthorized) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600">
        Checking permissions...
      </div>
    );
  }

  return <>{children}</>;
}
