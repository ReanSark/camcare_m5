// app/dashboard/layout.tsx
import React from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-blue-100 p-4">
        {/* Sidebar */}
        <h2 className="text-lg font-bold mb-4">Camcare</h2>
        {/* TODO: Add dynamic nav based on role */}
      </aside>
      <main className="flex-1 p-6 bg-gray-50">{children}</main>
    </div>
  );
}
