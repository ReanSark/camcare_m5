// "use client";

// import { useAuth } from "@/context/AuthContext";
// import { useRouter } from "next/navigation";
// import { useEffect } from "react";

// type RoleGuardProps = {
//   allowedRoles: string[];
//   children: React.ReactNode;
// };

// export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
//   const { user, role, loading, sessionChecked } = useAuth();
//   const router = useRouter();
    
//   // DEBUGGING CODE
//   console.log("🔍 RoleGuard Debug:");
//   console.log("User:", user);
//   console.log("Role:", role);
//   console.log("Session checked:", sessionChecked);
//   console.log("Loading:", loading);

//   useEffect(() => {
//     if (!sessionChecked) return; // ⏳ wait until session is checked at all

//     if (!user) {
//       console.warn("🔐 No session — redirecting to login");
//       router.push("/auth/login");
//     } else if (!role || !allowedRoles.includes(role)) {
//       console.warn(`🚫 Unauthorized role "${role}" — redirecting to /403`);
//       router.replace("/403");
//     }
//   }, [user, role, sessionChecked, router, allowedRoles]);

//   if (!sessionChecked || loading) {
//     return (
//       <div className="flex justify-center items-center h-screen text-gray-600">
//         Loading session...
//       </div>
//     );
//   }
  
//   const isAuthorized = !!user && !!role && allowedRoles.includes(role);

//   if (!isAuthorized) {
//   return (
//     <div className="flex justify-center items-center h-screen text-gray-600">
//       Checking authorization...
//     </div>
//   );
// }


//   return <>{children}</>;
// }
