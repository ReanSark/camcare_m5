// app/dashboard/layout.tsx
"use client";

import React from "react";
import { Protected } from '@/components/Protected';
import { useAuth } from "@/context/AuthContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, logout, loading } = useAuth();

  // Optional: prevent early hydration mismatches
  if (loading) return null;

  return (
    <Protected>
      <div className="min-h-screen flex">
        <aside className="w-64 bg-blue-100 p-4 flex flex-col justify-between">
          <div>
          <h2 className="text-xl font-bold mb-6">Camcare</h2>
          <p className="mb-6 text-sm text-gray-600">Role: {role}</p>
          {/* TODO: Add Nav Links */}
        </div>
        <button
          onClick={logout}
          className="bg-red-500 text-white py-2 rounded-md hover:bg-red-600"
        >
          Logout
        </button>
          {/* Sidebar */}
          <h2 className="text-lg font-bold mb-4">Camcare</h2>
          {/* TODO: Add dynamic nav based on role */}
        </aside>
      <main className="flex-1 p-6 bg-gray-50">{children}</main>
      </div>
    </Protected>
    
  );
}
