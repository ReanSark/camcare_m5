// app/dashboard/inventorystaff/layout.tsx
"use client";
import { ReactNode } from "react";
import RoleGuard from "@/components/RoleGuard";
import { useLogout } from "@/hooks/useLogout";

export default function InventoryStaffDashboardLayout({ children }: { children: ReactNode }) {
  const logout = useLogout();

  return (
    <RoleGuard allowedRoles={["InventoryStaff"]}>
      <div className="min-h-screen flex flex-col">
        <header className="bg-blue-600 text-white p-4 font-bold">InventoryStaff Dashboard</header>
        <button
          onClick={logout}
          className="text-sm bg-red-500 hover:bg-red-600 px-4 py-1 rounded"
        >
          Logout
        </button>
        <main className="flex-1 p-4">{children}</main>
      </div>
    </RoleGuard>
  );
}