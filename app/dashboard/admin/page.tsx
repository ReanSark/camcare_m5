import RoleGuard from "@/components/RoleGuard";

export default function AdminDashboard() {
  return (
    <RoleGuard allowedRoles={["Admin"]}>
      <div>
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <p className="text-gray-700">Welcome, Admin! Here is your overview.</p>
      </div>
    </RoleGuard>
  );
}

