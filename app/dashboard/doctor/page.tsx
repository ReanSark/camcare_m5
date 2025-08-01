import RoleGuard from "@/components/RoleGuard";

export default function AdminDoctorPage() {
  return (
    <RoleGuard allowedRoles={["Admin", "Doctor"]}>
      <div>Doctor Dashboard</div>
      <div>Visible to Admins and Doctors only.</div>
    </RoleGuard>
  );
}
