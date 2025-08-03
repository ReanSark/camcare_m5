// app/dashboard/layout.tsx
import DashboardShell from "@/components/client/DashboardShell"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
