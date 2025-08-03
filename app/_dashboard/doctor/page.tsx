import RoleGuard from "@/components/FutureRoleGuard";

export default function DoctorDashboard() {
  return (
    <RoleGuard allowedRoles={["Admin", "Doctor"]}>
      <div>Doctor Dashboard</div>
      <div>Visible to Admins and Doctors only.</div>
    </RoleGuard>
  );
}
