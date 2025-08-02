// app/layout.tsx
import "./globals.css";
import { Toaster } from 'sonner'
import { AuthProvider } from "@/context/AuthContext";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Camcare M4",
  description: "Clinic Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Toaster richColors />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
