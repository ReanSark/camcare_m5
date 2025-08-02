'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const roleAccessMap: Record<string, string[]> = {
  '/dashboard/admin': ['Admin'],
  '/dashboard/doctor': ['Doctor'],
  '/dashboard/nurse': ['Nurse'],
  '/dashboard/receptionist': ['Receptionist'],
  '/dashboard/pharmacist': ['Pharmacist'],
  '/dashboard/inventory': ['Inventory'],
};

export const Protected = ({ children }: { children: React.ReactNode }) => {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;// ✅ ADDED: prevent premature redirect

    // Not logged in
    if (!user) {
      console.warn("🔐 No user, redirecting to login"); // ✅ ADDED for clarity
      router.push('/auth/login');
      return;
    }

    // Check if this path is role-protected
    const allowedRoles = Object.entries(roleAccessMap).find(([path]) =>
      pathname.startsWith(path)
    )?.[1];

    if (allowedRoles && (!role || !allowedRoles.includes(role))) {
      console.warn("🚫 Unauthorized role, redirecting to /403");
      router.push('/403'); // Or show your own "Access Denied"
      return;
    }

  }, [user, role, loading, pathname, router]);

  if (loading || !user) return <div className="p-4">Loading...</div>; // 🔁 ADDED `!user` guard to match early return

  return <>{children}</>;
};
