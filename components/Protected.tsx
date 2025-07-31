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
    if (loading) return;

    // Not logged in
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Check if this path is role-protected
    const allowedRoles = Object.entries(roleAccessMap).find(([path]) =>
      pathname.startsWith(path)
    )?.[1];

    if (allowedRoles && (!role || !allowedRoles.includes(role))) {
        router.push('/403'); // Or show your own "Access Denied"
        return;
    }

  }, [user, role, loading, pathname, router]);

  if (loading) return <div className="p-4">Loading...</div>;

  return <>{children}</>;
};
