// app/layout.tsx
import "./globals.css";
import { Toaster } from 'sonner'
import { AuthProvider } from "@/context/FutureAuthContext";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Camcare Clinic System",
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
