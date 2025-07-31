import { useRouter } from "next/navigation";

type Router = ReturnType<typeof useRouter>;

export function redirectByRole(role: string, router: Router) {
  const dashboardMap: Record<string, string> = {
    Admin: "/dashboard/admin",
    Doctor: "/dashboard/doctor",
    Nurse: "/dashboard/nurse",
    Receptionist: "/dashboard/receptionist",
    Pharmacist: "/dashboard/pharmacist",
    Inventory: "/dashboard/inventory",
  };

  const route = dashboardMap[role];

  if (route) {
    router.push(route);
  } else {
    router.push("/auth/login"); // fallback or 403
  }
}

