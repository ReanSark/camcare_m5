"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type RoleGuardProps = {
  allowedRole: string;
  children: React.ReactNode;
};

export default function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login");
      } else if (role !== allowedRole) {
        router.push("/403");
      }
    }
  }, [user, role, loading, router, allowedRole]);

  if (loading || !user || role !== allowedRole) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-600">
        Checking permissions...
      </div>
    );
  }

  return <>{children}</>;
}
