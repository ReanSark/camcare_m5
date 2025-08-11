// utils/redirectByRole.ts
"use client";

import { useRouter } from "next/navigation";

type Router = ReturnType<typeof useRouter>;

const roleRoutes: Record<string, string> = {
  Admin: "/dashboard/admin",
  Receptionist: "/dashboard/receptionist",
  Doctor: "/dashboard/doctor",
  Nurse: "/dashboard/nurse",
  InventoryStaff: "/dashboard/inventorystaff",
  Pharmacist: "/dashboard/pharmacist",
  LabTechnician: "/dashboard/labtechnician",
};

export function getDashboardPath(role: string): string {
  return roleRoutes[role] || "/403";
}

export function redirectByRole(role: string, router: Router) {
  const path = getDashboardPath(role);
  router.push(path);
}
