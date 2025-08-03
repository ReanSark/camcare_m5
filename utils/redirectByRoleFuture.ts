// import { useRouter } from "next/navigation";

// type Router = ReturnType<typeof useRouter>;

// /**
//  * Returns the dashboard route path for a given role.
//  */
// export function getDashboardPath(role: string): string {
//   const dashboardMap: Record<string, string> = {
//     Admin: "/dashboard/admin",
//     Doctor: "/dashboard/doctor",
//     Nurse: "/dashboard/nurse",
//     Receptionist: "/dashboard/receptionist",
//     Pharmacist: "/dashboard/pharmacist",
//     InventoryStaff: "/dashboard/inventory",
//     LabTechnician: "/dashboard/labtechnician",
//   };

//   return dashboardMap[role] || "/403"; // fallback
// }

// /**
//  * Redirects the user using the router to the dashboard path for their role.
//  */
// export function redirectByRole(role: string, router: Router) {
//   const path = getDashboardPath(role);
//   router.replace(path);
// }
